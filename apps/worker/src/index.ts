import {
  JOB_LEASE_MS,
  JobLeaseLostError,
  claimNextJob,
  emitJobUpdated,
  failJob,
  getJobStatus,
  recoverExpiredJobs,
  releaseJobLease,
  renewJobLease,
  setJobUpdatedHandler,
} from '@oryxel/ai/server'
import { checkDatabaseConnection, closeDatabase, db, user, withUserDataLock } from '@oryxel/db'
import {
  configureLogService,
  logError,
  logEvent,
  parseHealthCheckTimeout,
  runReadinessChecks,
  withLogContext,
} from '@oryxel/runtime'
import { eq } from 'drizzle-orm'
import Redis from 'ioredis'
import { createServer } from 'node:http'
import { URL } from 'node:url'

import { handleAgentChat } from './handlers/agent-chat'
import { handleListSliceSync } from './handlers/list-slice-sync'
import { handleProfileSync } from './handlers/profile-sync'
import { handleNotifyFollow, handleNotifyList, handleNotifyPost } from './handlers/social-notify'

import type { ClaimedJob } from '@oryxel/ai/server'

//
// Background poll cadence (ms). Lower than before so the worker picks up new jobs quickly without a publisher.
//
const POLL_INTERVAL_MS = 1000
const HEARTBEAT_INTERVAL_MS = Math.min(30_000, Math.floor(JOB_LEASE_MS / 3))
const RECOVERY_INTERVAL_MS = 30_000
const NEW_JOBS_CHANNEL = 'jobs:new'
const PORT = Number.parseInt(process.env.PORT ?? '3334', 10)
const HEALTHCHECK_TIMEOUT_MS = parseHealthCheckTimeout(process.env.HEALTHCHECK_TIMEOUT_MS)

configureLogService('worker')

const redisUrl = process.env.REDIS_URL?.trim()
let publisher: Redis | null = null
let jobSubscriber: Redis | null = null

if (redisUrl) {
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, protocol: 2 })

  publisher = redis

  redis.on('error', (error) => {
    logError('worker', 'redis.client.error', error, { component: 'publisher' })
  })

  setJobUpdatedHandler(async (jobId) => {
    await redis.publish(`job:${jobId}`, JSON.stringify({ jobId }))
  })

  const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: 3, protocol: 2 })

  jobSubscriber = subscriber

  subscriber.on('error', (error) => {
    logError('worker', 'redis.client.error', error, { component: 'subscriber' })
  })

  // Redis wake-ups are optional; startup and interval polling must not wait for Redis.
  // eslint-disable-next-line unicorn/prefer-top-level-await
  void subscriber.subscribe(NEW_JOBS_CHANNEL).catch((error) => {
    logError('worker', 'redis.subscribe.failed', error, { component: NEW_JOBS_CHANNEL })
  })

  subscriber.on('message', (channel) => {
    if (channel === NEW_JOBS_CHANNEL) void poll()
  })

  logEvent('worker', 'redis.pubsub.enabled', { mode: 'streams_and_wakeups' })
} else {
  logEvent('worker', 'redis.pubsub.disabled', { mode: 'interval_poll' }, 'warn')
}

async function processJob(job: ClaimedJob) {
  const params = job.params ?? {}

  const [userRow] = await db.select({ name: user.name }).from(user).where(eq(user.id, job.userId)).limit(1)

  if (!userRow) {
    await failJob(job, 'USER_NOT_FOUND')

    return
  }

  const userName = userRow.name

  emitJobUpdated(job.id)

  switch (job.type) {
    case 'agent_chat': {
      await handleAgentChat(job, job.userId, params)

      break
    }

    case 'profile_sync': {
      await handleProfileSync(job, job.userId, userName, params)

      break
    }

    case 'notify_post': {
      await handleNotifyPost(job, params)

      break
    }

    case 'notify_follow': {
      await handleNotifyFollow(job, params)

      break
    }

    case 'notify_list': {
      await handleNotifyList(job, job.userId, params)

      break
    }

    case 'list_slice_sync': {
      await handleListSliceSync(job, job.userId, params)

      break
    }
    default: {
      await failJob(job, 'UNKNOWN_JOB_TYPE')
    }
  }
}

async function logJobOutcome(job: ClaimedJob, startedAt: number) {
  try {
    const status = (await getJobStatus(job.id, job.userId)) ?? 'missing'

    logEvent(
      'worker',
      'job.processing.finished',
      {
        jobId: job.id,
        jobType: job.type,
        status,
        durationMs: Math.round(performance.now() - startedAt),
      },
      status === 'failed' || status === 'missing' ? 'warn' : 'info',
    )
  } catch (error) {
    logError('worker', 'job.status_lookup.failed', error, {
      jobId: job.id,
      jobType: job.type,
      durationMs: Math.round(performance.now() - startedAt),
    })
  }
}

async function processClaimedJob(job: ClaimedJob) {
  const startedAt = performance.now()
  let isRenewing = false
  let leaseLost = false

  logEvent('worker', 'job.processing.started', { jobId: job.id, jobType: job.type })

  const heartbeat = setInterval(() => {
    if (isRenewing || leaseLost) return

    isRenewing = true
    void renewJobLease(job)
      .then((renewed) => {
        leaseLost = !renewed
      })
      .catch((error) => {
        logError('worker', 'job.heartbeat.failed', error, { jobId: job.id, jobType: job.type })
      })
      .finally(() => {
        isRenewing = false
      })
  }, HEARTBEAT_INTERVAL_MS)

  try {
    await withUserDataLock(job.userId, () => processJob(job))
  } catch (error) {
    if (error instanceof JobLeaseLostError || leaseLost) {
      logEvent(
        'worker',
        'job.lease_lost',
        { jobId: job.id, jobType: job.type, durationMs: Math.round(performance.now() - startedAt) },
        'warn',
      )

      return
    }

    logError('worker', 'job.handler.failed', error, { jobId: job.id, jobType: job.type })

    try {
      await failJob(job, 'JOB_HANDLER_FAILED')
    } catch (failureError) {
      if (!(failureError instanceof JobLeaseLostError)) throw failureError

      logEvent('worker', 'job.lease_lost', { jobId: job.id, jobType: job.type }, 'warn')
    }
  } finally {
    clearInterval(heartbeat)
  }

  await logJobOutcome(job, startedAt)
}

let isPolling = false
let isRecovering = false
let isShuttingDown = false
let isStartupComplete = false
let shutdownPromise: Promise<void> | null = null

const healthServer = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (request.method === 'GET' && requestUrl.pathname === '/healthz') {
    response.writeHead(200, { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ status: 'ok', service: 'worker' }))

    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/readyz') {
    void runReadinessChecks(
      [
        {
          name: 'runtime',
          check: async () => {
            if (!isStartupComplete || isShuttingDown) throw new Error('Worker runtime is not ready')
          },
        },
        { name: 'database', check: checkDatabaseConnection },
        ...(publisher ? [{ name: 'redis', required: false, check: () => publisher.ping() }] : []),
      ],
      HEALTHCHECK_TIMEOUT_MS,
    ).then((result) => {
      response.writeHead(result.ready ? 200 : 503, {
        'cache-control': 'no-store',
        'content-type': 'application/json; charset=utf-8',
      })
      response.end(
        JSON.stringify({
          status: result.ready ? 'ready' : 'unavailable',
          service: 'worker',
          checks: result.checks,
        }),
      )
    })

    return
  }

  response.writeHead(404)
  response.end()
})

healthServer.listen(PORT, () => {
  logEvent('worker', 'health.server.started', { port: PORT })
})

async function recoverJobs() {
  if (isRecovering || isShuttingDown) return

  isRecovering = true

  try {
    const recovered = await recoverExpiredJobs()

    if (recovered.length > 0) logEvent('worker', 'jobs.expired_recovered', { count: recovered.length }, 'warn')
  } catch (error) {
    logError('worker', 'jobs.recovery.failed', error)
  } finally {
    isRecovering = false
  }
}

function disconnectRedis() {
  publisher?.disconnect()
  jobSubscriber?.disconnect()
}

function shutdownRuntime() {
  shutdownPromise ??= (async () => {
    disconnectRedis()
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        healthServer.close((error) => {
          if (error) reject(error)
          else resolve()
        })
      }),
      closeDatabase(),
    ])
    logEvent('worker', 'runtime.shutdown.completed')
  })()

  return shutdownPromise
}

async function finishShutdown() {
  try {
    await shutdownRuntime()
  } catch (error) {
    logError('worker', 'runtime.shutdown.failed', error)
    process.exitCode = 1
  }
}

async function poll() {
  if (isPolling || isShuttingDown) return

  isPolling = true

  try {
    let job = await claimNextJob()

    while (job) {
      if (isShuttingDown) {
        await releaseJobLease(job)

        break
      }

      const claimedJob = job

      await withLogContext({ jobId: claimedJob.id }, () => processClaimedJob(claimedJob))

      if (isShuttingDown) break

      job = await claimNextJob()
    }
  } catch (error) {
    logError('worker', 'jobs.poll.failed', error)
  } finally {
    isPolling = false

    if (isShuttingDown) await finishShutdown()
  }
}

logEvent('worker', 'runtime.started', { intervalMs: POLL_INTERVAL_MS, mode: 'poll' })

const pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS)
const recoveryTimer = setInterval(() => void recoverJobs(), RECOVERY_INTERVAL_MS)

function startShutdown(signal: string) {
  if (isShuttingDown) return

  isShuttingDown = true
  logEvent('worker', 'runtime.shutdown.started', { signal })
  clearInterval(pollTimer)
  clearInterval(recoveryTimer)

  if (!isPolling) void finishShutdown()
}

process.on('SIGTERM', () => startShutdown('SIGTERM'))
process.on('SIGINT', () => startShutdown('SIGINT'))
process.on('uncaughtExceptionMonitor', (error) => {
  logError('worker', 'runtime.uncaught_exception', error)
})

// Run immediately on startup
await recoverJobs()
isStartupComplete = true
// Startup readiness does not wait for the first potentially long-running job.
// eslint-disable-next-line unicorn/prefer-top-level-await
void poll()
