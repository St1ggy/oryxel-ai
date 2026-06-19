import { backgroundJob, db } from '@oryxel/db'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'

import { emitJobCreated, emitJobUpdated } from './job-notify'

import type { AiProviderName, StructuredPreferencePatch } from './contracts'

export type JobType =
  | 'profile_sync'
  | 'agent_chat'
  | 'notify_post'
  | 'notify_follow'
  | 'notify_list'
  | 'list_slice_sync'
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'

/** Sync-pipeline phases (profile_sync handler). */
export type SyncPhase = 'owned' | 'liked' | 'disliked' | 'neutral' | 'profile' | 'recommendations' | 'to_try'

/** Detailed agent-chat / per-call phases. */
export type AgentPhase =
  | 'validate'
  | 'load_context'
  | 'build_prompt'
  | 'model_call'
  | 'parse'
  | 'apply_profile'
  | 'apply_ops'
  | 'apply_recs'
  | 'translate'
  | 'done'

/** Legacy coarse phases — kept so older clients/UI keep rendering. */
export type LegacyPhase = 'analyzing' | 'applying'

export type JobPhase = SyncPhase | AgentPhase | LegacyPhase

export type JobProgressMeta = {
  provider?: AiProviderName
  model?: string
  tokensIn?: number
  tokensOut?: number
  attempt?: number
  durationMs?: number
  scenario?: string
  note?: string
}

export type JobProgress = {
  step: number
  total: number
  phase: JobPhase | string
  meta?: JobProgressMeta
}

/** Most recent N progress events kept on a job — older ones drop on append. */
export const MAX_PROGRESS_EVENTS = 50

export async function createJob(userId: string, type: JobType, params?: Record<string, unknown>) {
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

  emitJobCreated(row.id)

  return row.id
}

export async function pushJobProgress(jobId: number, event: JobProgress) {
  const appended = JSON.stringify([event])

  await db
    .update(backgroundJob)
    .set({
      // Append the new event, then drop the oldest if the array would exceed the cap.
      progress: sql`
        CASE
          WHEN jsonb_array_length(COALESCE(${backgroundJob.progress}, '[]'::jsonb) || ${appended}::jsonb)
               > ${MAX_PROGRESS_EVENTS}
          THEN (COALESCE(${backgroundJob.progress}, '[]'::jsonb) || ${appended}::jsonb) - 0
          ELSE COALESCE(${backgroundJob.progress}, '[]'::jsonb) || ${appended}::jsonb
        END
      `,
    })
    .where(eq(backgroundJob.id, jobId))

  emitJobUpdated(jobId)
}

/** Stream-time partial result from an in-flight provider call. UI may render preview. */
export async function pushPartialResult(jobId: number, partial: Partial<StructuredPreferencePatch>) {
  await db
    .update(backgroundJob)
    .set({ result: { partial: true, ...partial } as unknown as Record<string, unknown> })
    .where(and(eq(backgroundJob.id, jobId), eq(backgroundJob.status, 'processing')))

  emitJobUpdated(jobId)
}

export async function completeJob(jobId: number, result: Record<string, unknown>) {
  await db
    .update(backgroundJob)
    .set({ status: 'done', result, completedAt: new Date() })
    .where(eq(backgroundJob.id, jobId))

  emitJobUpdated(jobId)
}

export async function failJob(jobId: number, errorMessage: string) {
  await db
    .update(backgroundJob)
    .set({ status: 'failed', errorMessage, completedAt: new Date() })
    .where(eq(backgroundJob.id, jobId))

  emitJobUpdated(jobId)
}

/** Jobs in 'processing' older than this are considered stale and auto-failed. */
const STALE_PROCESSING_MS = 15 * 60 * 1000 // 15 minutes

export async function getActiveJobsForUser(userId: string) {
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

export async function getJob(jobId: number, userId: string) {
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
