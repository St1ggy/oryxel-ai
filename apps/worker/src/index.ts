import { emitJobUpdated, failJob, setJobUpdatedHandler } from '@oryxel/ai'
import { backgroundJob, db, user } from '@oryxel/db'
import { eq } from 'drizzle-orm'
import Redis from 'ioredis'

import { handleAgentChat } from './handlers/agent-chat'
import { handleProfileSync } from './handlers/profile-sync'

const POLL_INTERVAL_MS = 2000

const redisUrl = process.env.REDIS_URL?.trim()

if (redisUrl) {
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3 })

  redis.on('error', (error) => {
    console.error('[worker] redis error:', error instanceof Error ? error.message : error)
  })

  setJobUpdatedHandler(async (jobId) => {
    await redis.publish(`job:${jobId}`, JSON.stringify({ jobId }))
  })

  console.log('[worker] Redis pub/sub enabled for job streams')
} else {
  console.warn('[worker] REDIS_URL not set — job stream publishes disabled')
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

async function processJob(job: {
  id: number
  userId: string
  type: string
  params: Record<string, unknown> | null
}): Promise<void> {
  const params = job.params ?? {}

  const [userRow] = await db.select({ name: user.name }).from(user).where(eq(user.id, job.userId)).limit(1)

  const userName = userRow?.name ?? 'User'

  console.log(`[worker] processing job ${job.id} type=${job.type} userId=${job.userId}`)

  emitJobUpdated(job.id)

  if (job.type === 'agent_chat') {
    await handleAgentChat(job.id, job.userId, params)
  } else if (job.type === 'profile_sync') {
    await handleProfileSync(job.id, job.userId, userName, params)
  } else {
    await failJob(job.id, `Unknown job type: ${job.type}`)
  }
}

async function poll(): Promise<void> {
  try {
    const job = await claimNextJob()

    if (job) {
      await processJob(job)
    }
  } catch (error) {
    console.error('[worker] poll error:', error instanceof Error ? error.message : error)
  }
}

console.log('[worker] starting, polling every', POLL_INTERVAL_MS, 'ms')

setInterval(() => void poll(), POLL_INTERVAL_MS)

// Run immediately on startup
await poll()
