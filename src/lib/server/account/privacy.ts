import { eq, inArray } from 'drizzle-orm'

import { db } from '$lib/server/db'
import {
  account,
  aiPatchAuditLog,
  aiPendingPatch,
  session,
  user,
  userAiPreferences,
  userAiProviderKey,
  userChatMessage,
  userFragrance,
  userProfile,
  verification,
} from '$lib/server/db/schema'

export type UserExportPayload = {
  exportedAt: string
  user: {
    id: string
    email: string | null
    name: string | null
    image: string | null
    createdAt: Date
  } | null
  profile: typeof userProfile.$inferSelect | null
  aiPreferences: typeof userAiPreferences.$inferSelect | null
  providerKeys: {
    id: number
    provider: string
    label: string
    isDefault: boolean
    keyVersion: string
    createdAt: Date
    updatedAt: Date
    keyHint: string
  }[]
  diary: (typeof userFragrance.$inferSelect)[]
  chatHistory: (typeof userChatMessage.$inferSelect)[]
  pendingPatches: (typeof aiPendingPatch.$inferSelect)[]
  patchAuditLog: (typeof aiPatchAuditLog.$inferSelect)[]
}

function keyHintFromEncrypted(raw: string): string {
  const tail = raw.slice(-4)

  return `••••${tail || '****'}`
}

export async function collectUserExportData(userId: string): Promise<UserExportPayload> {
  const [userRow, profileRow, aiPreferencesRow, providerKeyRows, diaryRows, chatRows, pendingRows, auditRows] =
    await Promise.all([
      db.select().from(user).where(eq(user.id, userId)).limit(1),
      db.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1),
      db.select().from(userAiPreferences).where(eq(userAiPreferences.userId, userId)).limit(1),
      db.select().from(userAiProviderKey).where(eq(userAiProviderKey.userId, userId)),
      db.select().from(userFragrance).where(eq(userFragrance.userId, userId)),
      db.select().from(userChatMessage).where(eq(userChatMessage.userId, userId)),
      db.select().from(aiPendingPatch).where(eq(aiPendingPatch.userId, userId)),
      db.select().from(aiPatchAuditLog).where(eq(aiPatchAuditLog.userId, userId)),
    ])

  return {
    exportedAt: new Date().toISOString(),
    user: userRow[0] ?? null,
    profile: profileRow[0] ?? null,
    aiPreferences: aiPreferencesRow[0] ?? null,
    providerKeys: providerKeyRows.map((row) => ({
      id: row.id,
      provider: row.provider,
      label: row.label,
      isDefault: row.isDefault,
      keyVersion: row.keyVersion,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      keyHint: keyHintFromEncrypted(row.encryptedKey),
    })),
    diary: diaryRows,
    chatHistory: chatRows,
    pendingPatches: pendingRows,
    patchAuditLog: auditRows,
  }
}

export function toMarkdownExport(data: UserExportPayload): string {
  return [
    '# Oryxel Data Export',
    '',
    `- Exported at: ${data.exportedAt}`,
    `- User id: ${data.user?.id ?? 'unknown'}`,
    '',
    '## Profile',
    '```json',
    JSON.stringify(data.profile, null, 2),
    '```',
    '',
    '## AI Preferences',
    '```json',
    JSON.stringify(data.aiPreferences, null, 2),
    '```',
    '',
    '## Provider Keys (masked)',
    '```json',
    JSON.stringify(data.providerKeys, null, 2),
    '```',
    '',
    '## Diary',
    '```json',
    JSON.stringify(data.diary, null, 2),
    '```',
    '',
    '## Chat History',
    '```json',
    JSON.stringify(data.chatHistory, null, 2),
    '```',
    '',
    '## AI Pending Patches',
    '```json',
    JSON.stringify(data.pendingPatches, null, 2),
    '```',
    '',
    '## AI Audit Log',
    '```json',
    JSON.stringify(data.patchAuditLog, null, 2),
    '```',
  ].join('\n')
}

export async function deleteUserDataCompletely(input: { userId: string; userEmail?: string | null }): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(aiPatchAuditLog).where(eq(aiPatchAuditLog.userId, input.userId))
    await tx.delete(aiPendingPatch).where(eq(aiPendingPatch.userId, input.userId))
    await tx.delete(userChatMessage).where(eq(userChatMessage.userId, input.userId))
    await tx.delete(userAiProviderKey).where(eq(userAiProviderKey.userId, input.userId))
    await tx.delete(userAiPreferences).where(eq(userAiPreferences.userId, input.userId))
    await tx.delete(userFragrance).where(eq(userFragrance.userId, input.userId))
    await tx.delete(userProfile).where(eq(userProfile.userId, input.userId))
    await tx.delete(session).where(eq(session.userId, input.userId))
    await tx.delete(account).where(eq(account.userId, input.userId))

    if (input.userEmail) {
      await tx
        .delete(verification)
        .where(
          inArray(verification.identifier, [
            input.userEmail,
            input.userEmail.toLowerCase(),
            input.userEmail.toUpperCase(),
          ]),
        )
    }

    await tx.delete(user).where(eq(user.id, input.userId))
  })
}
