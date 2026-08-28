import { emitJobUpdated, failJob, setJobUpdatedHandler } from '@oryxel/ai/server'
import { backgroundJob, db, user } from '@oryxel/db'
import { eq } from 'drizzle-orm'
import Redis from 'ioredis'

import { handleAgentChat } from './handlers/agent-chat'
import { handleListSliceSync } from './handlers/list-slice-sync'
import { handleProfileSync } from './handlers/profile-sync'
import { handleNotifyFollow, handleNotifyList, handleNotifyPost } from './handlers/social-notify'

//
// Background poll cadence (ms). Lower than before so the worker picks up new jobs quickly without a publisher.
//
const POLL_INTERVAL_MS = 1000
const NEW_JOBS_CHANNEL = 'jobs:new'

const redisUrl = process.env.REDIS_URL?.trim()

if (redisUrl) {
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, protocol: 2 })

  redis.on('error', (error) => {
    console.error('[worker] redis error:', error instanceof Error ? error.message : error)
  })

  setJobUpdatedHandler(async (jobId) => {
    await redis.publish(`job:${jobId}`, JSON.stringify({ jobId }))
  })

  const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: 3, protocol: 2 })

  subscriber.on('error', (error) => {
    console.error('[worker] subscriber redis error:', error instanceof Error ? error.message : error)
  })

  try {
    await subscriber.subscribe(NEW_JOBS_CHANNEL)
  } catch (error) {
    console.error('[worker] subscribe failed:', error instanceof Error ? error.message : error)
  }

  subscriber.on('message', (channel) => {
    if (channel === NEW_JOBS_CHANNEL) void poll()
  })

  console.log('[worker] Redis pub/sub enabled for job streams + new-job wake-ups')
} else {
  console.warn('[worker] REDIS_URL not set — job stream publishes disabled, falling back to interval poll only')
}

async function claimNextJob() {
  // Atomically claim one pending job: UPDATE ... SET status='processing' WHERE id = (SELECT ...)
  // Neon serverless doesn't support FOR UPDATE SKIP LOCKED directly, so we use a two-step
  // approach: select first pending, then UPDATE with WHERE id=? AND status='pending'.
  const pending = await db
    .select({
      id: backgroundJob.id,
      userId: backgroundJob.userId,
      type: backgroundJob.type,
      params: backgroundJob.params,
    })
    .from(backgroundJob)
    .where(eq(backgroundJob.status, 'pending'))
    .orderBy(backgroundJob.createdAt)
    .limit(1)

  if (pending.length === 0) return null

  const job = pending[0]

  // Claim it atomically — only succeeds if still 'pending'
  const updated = await db
    .update(backgroundJob)
    .set({ status: 'processing' })
    .where(eq(backgroundJob.id, job.id))
    .returning({ id: backgroundJob.id })

  if (updated.length === 0) return null // Another worker claimed it first

  return job
}

async function processJob(job: { id: number; userId: string; type: string; params: Record<string, unknown> | null }) {
  const params = job.params ?? {}

  const [userRow] = await db.select({ name: user.name }).from(user).where(eq(user.id, job.userId)).limit(1)

  const userName = userRow?.name ?? 'User'

  console.log(`[worker] processing job ${job.id} type=${job.type} userId=${job.userId}`)

  emitJobUpdated(job.id)

  switch (job.type) {
    case 'agent_chat': {
      await handleAgentChat(job.id, job.userId, params)

      break
    }

    case 'profile_sync': {
      await handleProfileSync(job.id, job.userId, userName, params)

      break
    }

    case 'notify_post': {
      await handleNotifyPost(job.id, params)

      break
    }

    case 'notify_follow': {
      await handleNotifyFollow(job.id, params)

      break
    }

    case 'notify_list': {
      await handleNotifyList(job.id, job.userId, params)

      break
    }

    case 'list_slice_sync': {
      await handleListSliceSync(job.id, job.userId, params)

      break
    }
    default: {
      await failJob(job.id, `Unknown job type: ${job.type}`)
    }
  }
}

let isPolling = false

async function poll() {
  if (isPolling) return

  isPolling = true

  try {
    let job = await claimNextJob()

    while (job) {
      await processJob(job)
      job = await claimNextJob()
    }
  } catch (error) {
    console.error('[worker] poll error:', error instanceof Error ? error.message : error)
  } finally {
    isPolling = false
  }
}

console.log('[worker] starting, polling every', POLL_INTERVAL_MS, 'ms (fallback)')

setInterval(() => void poll(), POLL_INTERVAL_MS)

// Run immediately on startup
await poll()
