import {
  JOB_LEASE_MS,
  JobLeaseLostError,
  claimNextJob,
  emitJobUpdated,
  failJob,
  recoverExpiredJobs,
  releaseJobLease,
  renewJobLease,
  setJobUpdatedHandler,
} from '@oryxel/ai/server'
import { checkDatabaseConnection, closeDatabase, db, user, withUserDataLock } from '@oryxel/db'
import { parseHealthCheckTimeout, runReadinessChecks } from '@oryxel/runtime'
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

const redisUrl = process.env.REDIS_URL?.trim()
let publisher: Redis | null = null
let jobSubscriber: Redis | null = null

if (redisUrl) {
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, protocol: 2 })

  publisher = redis

  redis.on('error', (error) => {
    console.error('[worker] redis error:', error instanceof Error ? error.message : error)
  })

  setJobUpdatedHandler(async (jobId) => {
    await redis.publish(`job:${jobId}`, JSON.stringify({ jobId }))
  })

  const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: 3, protocol: 2 })

  jobSubscriber = subscriber

  subscriber.on('error', (error) => {
    console.error('[worker] subscriber redis error:', error instanceof Error ? error.message : error)
  })

  // Redis wake-ups are optional; startup and interval polling must not wait for Redis.
  // eslint-disable-next-line unicorn/prefer-top-level-await
  void subscriber.subscribe(NEW_JOBS_CHANNEL).catch((error) => {
    console.error('[worker] subscribe failed:', error instanceof Error ? error.message : error)
  })

  subscriber.on('message', (channel) => {
    if (channel === NEW_JOBS_CHANNEL) void poll()
  })

  console.log('[worker] Redis pub/sub enabled for job streams + new-job wake-ups')
} else {
  console.warn('[worker] REDIS_URL not set — job stream publishes disabled, falling back to interval poll only')
}

async function processJob(job: ClaimedJob) {
  const params = job.params ?? {}

  const [userRow] = await db.select({ name: user.name }).from(user).where(eq(user.id, job.userId)).limit(1)

  if (!userRow) {
    await failJob(job, 'User no longer exists')

    return
  }

  const userName = userRow.name

  console.log(`[worker] processing job ${job.id} type=${job.type} userId=${job.userId}`)

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
      await failJob(job, `Unknown job type: ${job.type}`)
    }
  }
}

async function processClaimedJob(job: ClaimedJob) {
  let isRenewing = false
  let leaseLost = false
  const heartbeat = setInterval(() => {
    if (isRenewing || leaseLost) return

    isRenewing = true
    void renewJobLease(job)
      .then((renewed) => {
        leaseLost = !renewed
      })
      .catch((error) => {
        console.error(`[worker] heartbeat failed for job ${job.id}:`, error instanceof Error ? error.message : error)
      })
      .finally(() => {
        isRenewing = false
      })
  }, HEARTBEAT_INTERVAL_MS)

  try {
    await withUserDataLock(job.userId, () => processJob(job))
  } catch (error) {
    if (error instanceof JobLeaseLostError || leaseLost) {
      console.warn(`[worker] stopped reporting job ${job.id} after losing its lease`)

      return
    }

    try {
      await failJob(job, error instanceof Error ? error.message : 'Unknown worker error')
    } catch (failureError) {
      if (!(failureError instanceof JobLeaseLostError)) throw failureError
    }
  } finally {
    clearInterval(heartbeat)
  }
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
  console.log(`[worker] health server listening on :${PORT}`)
})

async function recoverJobs() {
  if (isRecovering || isShuttingDown) return

  isRecovering = true

  try {
    await recoverExpiredJobs()
  } catch (error) {
    console.error('[worker] recovery error:', error instanceof Error ? error.message : error)
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
  })()

  return shutdownPromise
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

      await processClaimedJob(job)

      if (isShuttingDown) break

      job = await claimNextJob()
    }
  } catch (error) {
    console.error('[worker] poll error:', error instanceof Error ? error.message : error)
  } finally {
    isPolling = false

    if (isShuttingDown) await shutdownRuntime()
  }
}

console.log('[worker] starting, polling every', POLL_INTERVAL_MS, 'ms (fallback)')

const pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS)
const recoveryTimer = setInterval(() => void recoverJobs(), RECOVERY_INTERVAL_MS)

function startShutdown() {
  if (isShuttingDown) return

  isShuttingDown = true
  clearInterval(pollTimer)
  clearInterval(recoveryTimer)

  if (!isPolling) void shutdownRuntime()
}

process.on('SIGTERM', startShutdown)
process.on('SIGINT', startShutdown)

// Run immediately on startup
await recoverJobs()
isStartupComplete = true
// Startup readiness does not wait for the first potentially long-running job.
// eslint-disable-next-line unicorn/prefer-top-level-await
void poll()
