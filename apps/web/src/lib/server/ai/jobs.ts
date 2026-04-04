import { and, eq, sql } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { backgroundJob } from '$lib/server/db/schema'

export type JobType = 'profile_sync' | 'agent_chat'
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'
export type JobProgress = { step: number; total: number; phase: string }

export async function createJob(userId: string, type: JobType): Promise<number> {
  const [row] = await db
    .insert(backgroundJob)
    .values({ userId, type, status: 'processing' })
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
}

export async function completeJob(jobId: number, result: Record<string, unknown>): Promise<void> {
  await db
    .update(backgroundJob)
    .set({ status: 'done', result, completedAt: new Date() })
    .where(eq(backgroundJob.id, jobId))
}

export async function failJob(jobId: number, errorMessage: string): Promise<void> {
  await db
    .update(backgroundJob)
    .set({ status: 'failed', errorMessage, completedAt: new Date() })
    .where(eq(backgroundJob.id, jobId))
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
    })
    .from(backgroundJob)
    .where(and(eq(backgroundJob.id, jobId), eq(backgroundJob.userId, userId)))
    .limit(1)

  const row = rows[0]

  if (!row) return null

  return {
    id: row.id,
    status: row.status,
    progress: (row.progress ?? []) as JobProgress[],
    result: (row.result as Record<string, unknown>) ?? null,
    errorMessage: row.errorMessage,
  }
}
