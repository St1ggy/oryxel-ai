import { backgroundJob, db } from '@oryxel/db'
import { and, desc, eq, gt, inArray, lte, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { emitJobCreated, emitJobUpdated } from './job-notify'

import type { AiProviderName, StructuredPreferencePatch } from './contracts'

type DatabaseExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export type JobType =
  'profile_sync' | 'agent_chat' | 'notify_post' | 'notify_follow' | 'notify_list' | 'list_slice_sync'
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'

export type JobLease = {
  id: number
  leaseToken: string
}

export type ClaimedJob = JobLease & {
  userId: string
  type: JobType
  params: Record<string, unknown> | null
}

export class JobLeaseLostError extends Error {
  constructor(jobId: number) {
    super(`Lease lost for job ${jobId}`)
    this.name = 'JobLeaseLostError'
  }
}

//
// Sync-pipeline phases (profile_sync handler).
//
export type SyncPhase = 'owned' | 'liked' | 'disliked' | 'neutral' | 'profile' | 'recommendations' | 'to_try'

//
// Detailed agent-chat / per-call phases.
//
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

//
// Legacy coarse phases — kept so older clients/UI keep rendering.
//
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

//
// Most recent N progress events kept on a job — older ones drop on append.
//
export const MAX_PROGRESS_EVENTS = 50
export const JOB_LEASE_MS = 5 * 60 * 1000

const leaseExpiry = sql<Date>`now() + (${JOB_LEASE_MS} * interval '1 millisecond')`

function activeLease(job: JobLease) {
  return and(
    eq(backgroundJob.id, job.id),
    eq(backgroundJob.status, 'processing'),
    eq(backgroundJob.leaseToken, job.leaseToken),
    gt(backgroundJob.leaseExpiresAt, sql`now()`),
  )
}

function requireUpdatedJob(job: JobLease, updated: { id: number }[]) {
  if (updated.length === 0) throw new JobLeaseLostError(job.id)

  emitJobUpdated(job.id)
}

export async function createJob(
  userId: string,
  type: JobType,
  params?: Record<string, unknown>,
  executor: DatabaseExecutor = db,
) {
  // For non-chat types, cancel any pending jobs of the same type so the
  // user always gets a fresh run without queue buildup.
  if (type !== 'agent_chat') {
    await executor
      .update(backgroundJob)
      .set({ status: 'cancelled', completedAt: new Date() })
      .where(and(eq(backgroundJob.userId, userId), eq(backgroundJob.type, type), eq(backgroundJob.status, 'pending')))
  }

  const [row] = await executor
    .insert(backgroundJob)
    .values({ userId, type, status: 'pending', params })
    .returning({ id: backgroundJob.id })

  if (executor === db) emitJobCreated(row.id)

  return row.id
}

export async function claimNextJob(): Promise<ClaimedJob | null> {
  return db.transaction(async (tx) => {
    const [pending] = await tx
      .select({
        id: backgroundJob.id,
        userId: backgroundJob.userId,
        type: backgroundJob.type,
        params: backgroundJob.params,
      })
      .from(backgroundJob)
      .where(eq(backgroundJob.status, 'pending'))
      .orderBy(backgroundJob.createdAt, backgroundJob.id)
      .for('update', { skipLocked: true })
      .limit(1)

    if (!pending) return null

    const leaseToken = randomUUID()
    const [claimed] = await tx
      .update(backgroundJob)
      .set({
        status: 'processing',
        leaseToken,
        leaseExpiresAt: leaseExpiry,
        errorMessage: null,
        completedAt: null,
      })
      .where(and(eq(backgroundJob.id, pending.id), eq(backgroundJob.status, 'pending')))
      .returning({ id: backgroundJob.id })

    if (!claimed) return null

    return {
      id: pending.id,
      userId: pending.userId,
      type: pending.type as JobType,
      params: pending.params,
      leaseToken,
    }
  })
}

export async function renewJobLease(job: JobLease) {
  const updated = await db
    .update(backgroundJob)
    .set({ leaseExpiresAt: leaseExpiry })
    .where(activeLease(job))
    .returning({ id: backgroundJob.id })

  return updated.length > 0
}

export async function releaseJobLease(job: JobLease) {
  const released = await db
    .update(backgroundJob)
    .set({ status: 'pending', leaseToken: null, leaseExpiresAt: null })
    .where(activeLease(job))
    .returning({ id: backgroundJob.id })

  return released.length > 0
}

export async function assertJobLease(job: JobLease) {
  if (!(await renewJobLease(job))) throw new JobLeaseLostError(job.id)
}

export async function recoverExpiredJobs() {
  const recovered = await db
    .update(backgroundJob)
    .set({
      status: 'failed',
      errorMessage: 'Worker lease expired',
      completedAt: sql`now()`,
      leaseToken: null,
      leaseExpiresAt: null,
    })
    .where(and(eq(backgroundJob.status, 'processing'), lte(backgroundJob.leaseExpiresAt, sql`now()`)))
    .returning({ id: backgroundJob.id })

  for (const job of recovered) emitJobUpdated(job.id)

  return recovered.map(({ id }) => id)
}

export async function pushJobProgress(job: JobLease, event: JobProgress) {
  const appended = JSON.stringify([event])

  const updated = await db
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
    .where(activeLease(job))
    .returning({ id: backgroundJob.id })

  requireUpdatedJob(job, updated)
}

//
// Stream-time partial result from an in-flight provider call. UI may render preview.
//
export async function pushPartialResult(job: JobLease, partial: Partial<StructuredPreferencePatch>) {
  const updated = await db
    .update(backgroundJob)
    .set({ result: { partial: true, ...partial } as unknown as Record<string, unknown> })
    .where(activeLease(job))
    .returning({ id: backgroundJob.id })

  requireUpdatedJob(job, updated)
}

export async function completeJob(job: JobLease, result: Record<string, unknown>) {
  const updated = await db
    .update(backgroundJob)
    .set({
      status: 'done',
      result,
      completedAt: sql`now()`,
      leaseToken: null,
      leaseExpiresAt: null,
    })
    .where(activeLease(job))
    .returning({ id: backgroundJob.id })

  requireUpdatedJob(job, updated)
}

export async function failJob(job: JobLease, errorMessage: string) {
  const updated = await db
    .update(backgroundJob)
    .set({
      status: 'failed',
      errorMessage,
      completedAt: sql`now()`,
      leaseToken: null,
      leaseExpiresAt: null,
    })
    .where(activeLease(job))
    .returning({ id: backgroundJob.id })

  requireUpdatedJob(job, updated)
}

export async function getActiveJobsForUser(userId: string) {
  const rows = await db
    .select({
      id: backgroundJob.id,
      type: backgroundJob.type,
      status: backgroundJob.status,
      progress: backgroundJob.progress,
    })
    .from(backgroundJob)
    .where(and(eq(backgroundJob.userId, userId), inArray(backgroundJob.status, ['pending', 'processing'])))
    .orderBy(desc(backgroundJob.createdAt))

  return rows.map((row) => ({
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
