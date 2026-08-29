import { aiPatchAuditLog, aiPendingPatch, db, userChatMessage } from '@oryxel/db'
import { and, desc, eq } from 'drizzle-orm'

import { deleteOrphanedUserCatalogEntities } from '../diary/catalog-lifecycle'
import { applyListOps, enqueueListNotifyJob } from '../social/apply-list-ops'

import { applyPatchToDatabase, patchMayOrphanCatalogEntities } from './apply'
import { decryptSecret, encryptSecret } from './crypto/secret-box'

import type { StructuredPreferencePatch } from './contracts'

type PendingPatchApplyResult =
  | {
      status: 'applied'
      payload: StructuredPreferencePatch
      wasAlreadyApplied: boolean
    }
  | { status: 'conflict'; currentStatus: string }
  | { status: 'not_found' }

type PendingPatchRejectResult =
  | { status: 'rejected'; wasAlreadyRejected: boolean }
  | { status: 'conflict'; currentStatus: string }
  | { status: 'not_found' }

type DatabaseExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

async function appendPatchAuditLogWithExecutor(
  executor: DatabaseExecutor,
  input: {
    userId: string
    patchId: number
    action: string
    details?: Record<string, unknown>
  },
) {
  await executor.insert(aiPatchAuditLog).values(input)
}

async function markPendingPatchFailed(input: {
  patchId: number
  userId: string
  expectedStatus: 'created' | 'confirmed'
  failureReason: string
}) {
  await db.transaction(async (tx) => {
    const [failed] = await tx
      .update(aiPendingPatch)
      .set({ status: 'failed', failedAt: new Date(), failureReason: input.failureReason })
      .where(
        and(
          eq(aiPendingPatch.id, input.patchId),
          eq(aiPendingPatch.userId, input.userId),
          eq(aiPendingPatch.status, input.expectedStatus),
        ),
      )
      .returning({ id: aiPendingPatch.id })

    if (!failed) return

    await appendPatchAuditLogWithExecutor(tx, {
      userId: input.userId,
      patchId: input.patchId,
      action: 'failed',
      details: { failureReason: input.failureReason },
    })
  })
}

export async function applyPendingPatch(input: {
  patchId: number
  userId: string
  expectedStatus: 'created' | 'confirmed'
  recordConfirmation?: boolean
}): Promise<PendingPatchApplyResult> {
  try {
    return await db.transaction(async (tx) => {
      const [patch] = await tx
        .select()
        .from(aiPendingPatch)
        .where(and(eq(aiPendingPatch.id, input.patchId), eq(aiPendingPatch.userId, input.userId)))
        .for('update')
        .limit(1)

      if (!patch) return { status: 'not_found' }

      const payload = patch.payload as unknown as StructuredPreferencePatch

      if (patch.status === 'applied') {
        return { status: 'applied', payload, wasAlreadyApplied: true }
      }

      if (patch.status !== input.expectedStatus) {
        return { status: 'conflict', currentStatus: patch.status }
      }

      if (input.recordConfirmation) {
        await tx
          .update(aiPendingPatch)
          .set({ status: 'confirmed', confirmedAt: new Date() })
          .where(and(eq(aiPendingPatch.id, patch.id), eq(aiPendingPatch.status, input.expectedStatus)))
          .returning({ id: aiPendingPatch.id })

        await appendPatchAuditLogWithExecutor(tx, {
          userId: input.userId,
          patchId: patch.id,
          action: 'confirmed',
        })
      }

      await applyPatchToDatabase(input.userId, payload, tx)

      const listResult = payload.listOps?.length ? await applyListOps(input.userId, payload.listOps, tx) : null

      if (
        patchMayOrphanCatalogEntities(payload) ||
        payload.listOps?.some((operation) => operation.op === 'remove') === true
      ) {
        await deleteOrphanedUserCatalogEntities(tx)
      }

      if (listResult?.notifyList && listResult.createdListIds[0]) {
        await enqueueListNotifyJob(input.userId, listResult.createdListIds[0], tx)
      }

      await tx
        .update(aiPendingPatch)
        .set({ status: 'applied', appliedAt: new Date(), failureReason: null })
        .where(and(eq(aiPendingPatch.id, patch.id), eq(aiPendingPatch.userId, input.userId)))
        .returning({ id: aiPendingPatch.id })

      await appendPatchAuditLogWithExecutor(tx, {
        userId: input.userId,
        patchId: patch.id,
        action: 'applied',
      })

      return {
        status: 'applied',
        payload,
        wasAlreadyApplied: false,
      }
    })
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : 'Patch apply failed'

    try {
      await markPendingPatchFailed({ ...input, failureReason })
    } catch {
      // Preserve the apply error if the best-effort failure marker also fails.
    }

    throw error
  }
}

export async function rejectPendingPatch(input: {
  patchId: number
  userId: string
}): Promise<PendingPatchRejectResult> {
  return db.transaction(async (tx) => {
    const [patch] = await tx
      .select({ id: aiPendingPatch.id, status: aiPendingPatch.status })
      .from(aiPendingPatch)
      .where(and(eq(aiPendingPatch.id, input.patchId), eq(aiPendingPatch.userId, input.userId)))
      .for('update')
      .limit(1)

    if (!patch) return { status: 'not_found' }

    if (patch.status === 'rejected') return { status: 'rejected', wasAlreadyRejected: true }

    if (patch.status !== 'created') return { status: 'conflict', currentStatus: patch.status }

    await tx
      .update(aiPendingPatch)
      .set({ status: 'rejected', rejectedAt: new Date() })
      .where(and(eq(aiPendingPatch.id, patch.id), eq(aiPendingPatch.status, 'created')))
      .returning({ id: aiPendingPatch.id })

    await appendPatchAuditLogWithExecutor(tx, {
      userId: input.userId,
      patchId: patch.id,
      action: 'rejected',
    })

    return { status: 'rejected', wasAlreadyRejected: false }
  })
}

export async function createPendingPatch(input: {
  userId: string
  patchType: 'critical' | 'minor'
  patch: StructuredPreferencePatch
  attempts?: Record<string, unknown>[]
}) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(aiPendingPatch)
      .values({
        userId: input.userId,
        patchType: input.patchType,
        payload: input.patch as unknown as Record<string, unknown>,
        summary: input.patch.summary,
        confidence: Math.round(input.patch.confidence * 100),
        status: 'created',
      })
      .returning()

    await appendPatchAuditLogWithExecutor(tx, {
      userId: input.userId,
      patchId: created.id,
      action: 'created',
      details: { source: 'ai-router', attempts: input.attempts ?? [] },
    })

    return created
  })
}

export async function getLatestPendingPatches(userId: string, limit = 5) {
  return db
    .select()
    .from(aiPendingPatch)
    .where(eq(aiPendingPatch.userId, userId))
    .orderBy(desc(aiPendingPatch.createdAt))
    .limit(limit)
}

export async function updatePatchStatus(input: {
  patchId: number
  userId: string
  action: 'confirmed' | 'rejected' | 'applied' | 'failed'
  failureReason?: string
}) {
  const now = new Date()
  const patchStatusMap = {
    confirmed: {
      status: 'confirmed',
      confirmedAt: now,
    },
    rejected: {
      status: 'rejected',
      rejectedAt: now,
    },
    applied: {
      status: 'applied',
      appliedAt: now,
    },
    failed: {
      status: 'failed',
      failedAt: now,
      failureReason: input.failureReason ?? 'Unknown apply error',
    },
  } as const

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(aiPendingPatch)
      .set(patchStatusMap[input.action])
      .where(and(eq(aiPendingPatch.id, input.patchId), eq(aiPendingPatch.userId, input.userId)))
      .returning({ id: aiPendingPatch.id })

    if (!updated) return

    await appendPatchAuditLogWithExecutor(tx, {
      userId: input.userId,
      patchId: input.patchId,
      action: input.action,
      details: input.failureReason ? { failureReason: input.failureReason } : undefined,
    })
  })
}

export async function appendPatchAuditLog(input: {
  userId: string
  patchId?: number
  action: string
  details?: Record<string, unknown>
}) {
  await db.insert(aiPatchAuditLog).values({
    userId: input.userId,
    patchId: input.patchId,
    action: input.action,
    details: input.details,
  })
}

function decryptContent(row: {
  encryptedContent: string
  contentIv: string
  contentAuthTag: string
  contentVersion: string
}) {
  return decryptSecret({
    encryptedKey: row.encryptedContent,
    keyIv: row.contentIv,
    keyAuthTag: row.contentAuthTag,
    keyVersion: row.contentVersion,
  })
}

export async function createChatMessage(input: {
  userId: string
  role: 'user' | 'assistant'
  content: string
  locale: string
  scenario?: 'analog' | 'pyramid' | 'recommendation' | 'comparison' | 'command'
}) {
  const encrypted = encryptSecret(input.content)

  const [row] = await db
    .insert(userChatMessage)
    .values({
      userId: input.userId,
      role: input.role,
      encryptedContent: encrypted.encryptedKey,
      contentIv: encrypted.keyIv,
      contentAuthTag: encrypted.keyAuthTag,
      contentVersion: encrypted.keyVersion,
      locale: input.locale,
      scenario: input.scenario,
    })
    .returning()

  return { ...row, content: input.content }
}

export async function listLatestChatMessages(userId: string, limit = 50) {
  const rows = await db
    .select()
    .from(userChatMessage)
    .where(eq(userChatMessage.userId, userId))
    .orderBy(desc(userChatMessage.createdAt))
    .limit(limit)

  return rows.map((row) => ({ ...row, content: decryptContent(row) }))
}

export async function loadRecentChatMessages(userId: string, limit = 6) {
  const rows = await db
    .select({
      role: userChatMessage.role,
      encryptedContent: userChatMessage.encryptedContent,
      contentIv: userChatMessage.contentIv,
      contentAuthTag: userChatMessage.contentAuthTag,
      contentVersion: userChatMessage.contentVersion,
    })
    .from(userChatMessage)
    .where(eq(userChatMessage.userId, userId))
    .orderBy(desc(userChatMessage.createdAt))
    .limit(limit)

  return [...rows].reverse().map((row) => {
    const content = decryptContent(row)

    return {
      role: row.role,
      content: content.length > 380 ? `${content.slice(0, 380)}…` : content,
    }
  })
}
