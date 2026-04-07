import { backgroundJob, db } from '@oryxel/db'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'

import { emitJobUpdated } from './job-notify'

export type JobType = 'profile_sync' | 'agent_chat'
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'
export type JobProgress = { step: number; total: number; phase: string }

export async function createJob(userId: string, type: JobType, params?: Record<string, unknown>): Promise<number> {
  // For non-chat types, cancel any pending jobs of the same type so the
  // user always gets a fresh run without queue buildup.
  if (type !== 'agent_chat') {
    await db
      .update(backgroundJob)
      .set({ status: 'cancelled', completedAt: new Date() })
      .where(and(eq(backgroundJob.userId, userId), eq(backgroundJob.type, type), eq(backgroundJob.status, 'pending')))
  }

  const [row] = await db
    .insert(backgroundJob)
    .values({ userId, type, status: 'pending', params })
    .returning({ id: backgroundJob.id })

  return row.id
}

export async function pushJobProgress(jobId: number, event: JobProgress): Promise<void> {
  await db
    .update(backgroundJob)
    .set({
      progress: sql`COALESCE(${backgroundJob.progress}, '[]'::jsonb) || ${JSON.stringify([event])}::jsonb`,
    })
    .where(eq(backgroundJob.id, jobId))

  emitJobUpdated(jobId)
}

export async function completeJob(jobId: number, result: Record<string, unknown>): Promise<void> {
  await db
    .update(backgroundJob)
    .set({ status: 'done', result, completedAt: new Date() })
    .where(eq(backgroundJob.id, jobId))

  emitJobUpdated(jobId)
}

export async function failJob(jobId: number, errorMessage: string): Promise<void> {
  await db
    .update(backgroundJob)
    .set({ status: 'failed', errorMessage, completedAt: new Date() })
    .where(eq(backgroundJob.id, jobId))

  emitJobUpdated(jobId)
}

/** Jobs in 'processing' older than this are considered stale and auto-failed. */
const STALE_PROCESSING_MS = 15 * 60 * 1000 // 15 minutes

export async function getActiveJobsForUser(
  userId: string,
): Promise<{ id: number; type: JobType; status: JobStatus; progress: JobProgress[] }[]> {
  const rows = await db
    .select({
      id: backgroundJob.id,
      type: backgroundJob.type,
      status: backgroundJob.status,
      progress: backgroundJob.progress,
      createdAt: backgroundJob.createdAt,
    })
    .from(backgroundJob)
    .where(and(eq(backgroundJob.userId, userId), inArray(backgroundJob.status, ['pending', 'processing'])))
    .orderBy(desc(backgroundJob.createdAt))

  const stale = rows.filter(
    (row) => row.status === 'processing' && Date.now() - row.createdAt.getTime() > STALE_PROCESSING_MS,
  )

  if (stale.length > 0) {
    await Promise.all(stale.map((row) => failJob(row.id, 'Job timed out')))
  }

  return rows
    .filter((row) => !stale.some((s) => s.id === row.id))
    .map((row) => ({
      id: row.id,
      type: row.type as JobType,
      status: row.status as JobStatus,
      progress: (row.progress ?? []) as JobProgress[],
    }))
}

export async function getJob(
  jobId: number,
  userId: string,
): Promise<{
  id: number
  status: string
  progress: JobProgress[]
  result: Record<string, unknown> | null
  errorMessage: string | null
} | null> {
  const rows = await db
    .select({
      id: backgroundJob.id,
      userId: backgroundJob.userId,
      status: backgroundJob.status,
      progress: backgroundJob.progress,
      result: backgroundJob.result,
      errorMessage: backgroundJob.errorMessage,
      createdAt: backgroundJob.createdAt,
    })
    .from(backgroundJob)
    .where(and(eq(backgroundJob.id, jobId), eq(backgroundJob.userId, userId)))
    .limit(1)

  const row = rows[0]

  if (!row) return null

  // Auto-fail jobs stuck in 'processing' beyond the stale threshold.
  if (row.status === 'processing' && Date.now() - row.createdAt.getTime() > STALE_PROCESSING_MS) {
    await failJob(row.id, 'Job timed out')

    return {
      id: row.id,
      status: 'failed',
      progress: (row.progress ?? []) as JobProgress[],
      result: null,
      errorMessage: 'Job timed out',
    }
  }

  return {
    id: row.id,
    status: row.status,
    progress: (row.progress ?? []) as JobProgress[],
    result: (row.result as Record<string, unknown>) ?? null,
    errorMessage: row.errorMessage,
  }
}
