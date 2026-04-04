import { aiPatchAuditLog, aiPendingPatch, db, userChatMessage } from '@oryxel/db'
import { desc, eq } from 'drizzle-orm'

import { decryptSecret, encryptSecret } from './crypto/secret-box'

import type { StructuredPreferencePatch } from './contracts'

export async function createPendingPatch(input: {
  userId: string
  patchType: 'critical' | 'minor'
  patch: StructuredPreferencePatch
  attempts?: Record<string, unknown>[]
}) {
  const [created] = await db
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

  await db.insert(aiPatchAuditLog).values({
    userId: input.userId,
    patchId: created.id,
    action: 'created',
    details: { source: 'ai-router', attempts: input.attempts ?? [] },
  })

  return created
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

  await db.update(aiPendingPatch).set(patchStatusMap[input.action]).where(eq(aiPendingPatch.id, input.patchId))

  await db.insert(aiPatchAuditLog).values({
    userId: input.userId,
    patchId: input.patchId,
    action: input.action,
    details: input.failureReason ? { failureReason: input.failureReason } : undefined,
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
}): string {
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
