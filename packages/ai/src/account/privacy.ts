import {
  account,
  aiPatchAuditLog,
  aiPendingPatch,
  aiRecommendationDismissed,
  backgroundJob,
  db,
  notification,
  notificationPreference,
  post,
  postAttachment,
  session,
  user,
  userActivityLog,
  userAgentMemory,
  userAiPreferences,
  userAiProviderKey,
  userChatMessage,
  userFollow,
  userFragrance,
  userList,
  userListItem,
  userProfile,
  verification,
  withUserDataLock,
} from '@oryxel/db'
import { eq, inArray, or, sql } from 'drizzle-orm'

import { decryptSecret } from '../ai/crypto/secret-box'
import { prepareUserCatalogForAccountDeletion } from '../diary/catalog-lifecycle'

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
  chatHistory: {
    id: number
    userId: string
    role: string
    content: string
    scenario: string | null
    locale: string
    createdAt: Date
  }[]
  pendingPatches: (typeof aiPendingPatch.$inferSelect)[]
  patchAuditLog: (typeof aiPatchAuditLog.$inferSelect)[]
  recommendationDismissals: (typeof aiRecommendationDismissed.$inferSelect)[]
  activityLog: (typeof userActivityLog.$inferSelect)[]
  agentMemory: (typeof userAgentMemory.$inferSelect)[]
  backgroundJobs: Omit<typeof backgroundJob.$inferSelect, 'leaseToken'>[]
  lists: (typeof userList.$inferSelect & { items: (typeof userListItem.$inferSelect)[] })[]
  follows: (typeof userFollow.$inferSelect)[]
  posts: (typeof post.$inferSelect & { attachments: (typeof postAttachment.$inferSelect)[] })[]
  notifications: (typeof notification.$inferSelect)[]
  notificationPreferences: (typeof notificationPreference.$inferSelect)[]
  sessions: Omit<typeof session.$inferSelect, 'token'>[]
  linkedAccounts: Pick<
    typeof account.$inferSelect,
    'id' | 'accountId' | 'providerId' | 'userId' | 'scope' | 'createdAt' | 'updatedAt'
  >[]
}

function keyHint(raw: string) {
  const normalized = raw.trim()

  return normalized.length <= 4 ? '••••' : `••••${normalized.slice(-4)}`
}

function omitField<T extends object, K extends keyof T>(row: T, key: K): Omit<T, K> {
  const result = { ...row } as Partial<T>

  delete result[key]

  return result as Omit<T, K>
}

function getListItems(items: (typeof userListItem.$inferSelect)[], listId: number) {
  return items.filter((item) => item.listId === listId)
}

function getPostAttachments(attachments: (typeof postAttachment.$inferSelect)[], postId: number) {
  return attachments.filter((attachment) => attachment.postId === postId)
}

export async function collectUserExportData(userId: string) {
  return withUserDataLock(userId, () =>
    db.transaction(
      async (tx) => {
        const [
          userRow,
          profileRow,
          aiPreferencesRow,
          providerKeyRows,
          diaryRows,
          chatRows,
          pendingRows,
          auditRows,
          dismissalRows,
          activityRows,
          memoryRows,
          jobRows,
          listRows,
          followRows,
          postRows,
          notificationRows,
          notificationPreferenceRows,
          sessionRows,
          accountRows,
        ] = await Promise.all([
          tx.select().from(user).where(eq(user.id, userId)).limit(1),
          tx.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1),
          tx.select().from(userAiPreferences).where(eq(userAiPreferences.userId, userId)).limit(1),
          tx.select().from(userAiProviderKey).where(eq(userAiProviderKey.userId, userId)),
          tx.select().from(userFragrance).where(eq(userFragrance.userId, userId)),
          tx.select().from(userChatMessage).where(eq(userChatMessage.userId, userId)),
          tx.select().from(aiPendingPatch).where(eq(aiPendingPatch.userId, userId)),
          tx.select().from(aiPatchAuditLog).where(eq(aiPatchAuditLog.userId, userId)),
          tx.select().from(aiRecommendationDismissed).where(eq(aiRecommendationDismissed.userId, userId)),
          tx.select().from(userActivityLog).where(eq(userActivityLog.userId, userId)),
          tx.select().from(userAgentMemory).where(eq(userAgentMemory.userId, userId)),
          tx.select().from(backgroundJob).where(eq(backgroundJob.userId, userId)),
          tx.select().from(userList).where(eq(userList.userId, userId)),
          tx
            .select()
            .from(userFollow)
            .where(or(eq(userFollow.followerId, userId), eq(userFollow.followingId, userId))),
          tx.select().from(post).where(eq(post.authorId, userId)),
          tx.select().from(notification).where(eq(notification.recipientId, userId)),
          tx.select().from(notificationPreference).where(eq(notificationPreference.userId, userId)),
          tx.select().from(session).where(eq(session.userId, userId)),
          tx.select().from(account).where(eq(account.userId, userId)),
        ])

        const [listItemRows, attachmentRows] = await Promise.all([
          listRows.length > 0
            ? tx
                .select()
                .from(userListItem)
                .where(
                  inArray(
                    userListItem.listId,
                    listRows.map((row) => row.id),
                  ),
                )
            : Promise.resolve<(typeof userListItem.$inferSelect)[]>([]),
          postRows.length > 0
            ? tx
                .select()
                .from(postAttachment)
                .where(
                  inArray(
                    postAttachment.postId,
                    postRows.map((row) => row.id),
                  ),
                )
            : Promise.resolve<(typeof postAttachment.$inferSelect)[]>([]),
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
            keyHint: keyHint(
              decryptSecret({
                encryptedKey: row.encryptedKey,
                keyIv: row.keyIv,
                keyAuthTag: row.keyAuthTag,
                keyVersion: row.keyVersion,
              }),
            ),
          })),
          diary: diaryRows,
          chatHistory: chatRows.map((row) => ({
            id: row.id,
            userId: row.userId,
            role: row.role,
            content: decryptSecret({
              encryptedKey: row.encryptedContent,
              keyIv: row.contentIv,
              keyAuthTag: row.contentAuthTag,
              keyVersion: row.contentVersion,
            }),
            scenario: row.scenario,
            locale: row.locale,
            createdAt: row.createdAt,
          })),
          pendingPatches: pendingRows,
          patchAuditLog: auditRows,
          recommendationDismissals: dismissalRows,
          activityLog: activityRows,
          agentMemory: memoryRows,
          backgroundJobs: jobRows.map((row) => omitField(row, 'leaseToken')),
          lists: listRows.map((list) => ({
            ...list,
            items: getListItems(listItemRows, list.id),
          })),
          follows: followRows,
          posts: postRows.map((userPost) => ({
            ...userPost,
            attachments: getPostAttachments(attachmentRows, userPost.id),
          })),
          notifications: notificationRows,
          notificationPreferences: notificationPreferenceRows,
          sessions: sessionRows.map((row) => omitField(row, 'token')),
          linkedAccounts: accountRows.map(
            ({ id, accountId, providerId, userId: accountUserId, scope, createdAt, updatedAt }) => ({
              id,
              accountId,
              providerId,
              userId: accountUserId,
              scope,
              createdAt,
              updatedAt,
            }),
          ),
        }
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    ),
  )
}

export function toMarkdownExport(data: UserExportPayload) {
  return [
    '# Oryxel Data Export',
    '',
    `- Exported at: ${data.exportedAt}`,
    `- User id: ${data.user?.id ?? 'unknown'}`,
    '',
    '## Account',
    '```json',
    JSON.stringify(data.user, null, 2),
    '```',
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
    '',
    '## Recommendation Dismissals',
    '```json',
    JSON.stringify(data.recommendationDismissals, null, 2),
    '```',
    '',
    '## Activity Log',
    '```json',
    JSON.stringify(data.activityLog, null, 2),
    '```',
    '',
    '## Agent Memory',
    '```json',
    JSON.stringify(data.agentMemory, null, 2),
    '```',
    '',
    '## Background Jobs',
    '```json',
    JSON.stringify(data.backgroundJobs, null, 2),
    '```',
    '',
    '## Lists',
    '```json',
    JSON.stringify(data.lists, null, 2),
    '```',
    '',
    '## Follows',
    '```json',
    JSON.stringify(data.follows, null, 2),
    '```',
    '',
    '## Posts',
    '```json',
    JSON.stringify(data.posts, null, 2),
    '```',
    '',
    '## Notifications',
    '```json',
    JSON.stringify(data.notifications, null, 2),
    '```',
    '',
    '## Notification Preferences',
    '```json',
    JSON.stringify(data.notificationPreferences, null, 2),
    '```',
    '',
    '## Sessions (tokens omitted)',
    '```json',
    JSON.stringify(data.sessions, null, 2),
    '```',
    '',
    '## Linked Accounts (credentials omitted)',
    '```json',
    JSON.stringify(data.linkedAccounts, null, 2),
    '```',
  ].join('\n')
}

export async function deleteUserDataCompletely(input: { userId: string; userEmail?: string | null }) {
  await withUserDataLock(input.userId, () =>
    db.transaction(async (tx) => {
      await tx
        .delete(notification)
        .where(or(eq(notification.recipientId, input.userId), eq(notification.actorId, input.userId)))
      await tx.delete(notificationPreference).where(eq(notificationPreference.userId, input.userId))
      await tx.delete(backgroundJob).where(eq(backgroundJob.userId, input.userId))
      await tx.delete(post).where(eq(post.authorId, input.userId))
      await tx.delete(userList).where(eq(userList.userId, input.userId))
      await tx
        .delete(userFollow)
        .where(or(eq(userFollow.followerId, input.userId), eq(userFollow.followingId, input.userId)))
      await tx.delete(aiPatchAuditLog).where(eq(aiPatchAuditLog.userId, input.userId))
      await tx.delete(aiPendingPatch).where(eq(aiPendingPatch.userId, input.userId))
      await tx.delete(userChatMessage).where(eq(userChatMessage.userId, input.userId))
      await tx.delete(userActivityLog).where(eq(userActivityLog.userId, input.userId))
      await tx.delete(userAgentMemory).where(eq(userAgentMemory.userId, input.userId))
      await tx.delete(aiRecommendationDismissed).where(eq(aiRecommendationDismissed.userId, input.userId))
      await tx.delete(userAiProviderKey).where(eq(userAiProviderKey.userId, input.userId))
      await tx.delete(userAiPreferences).where(eq(userAiPreferences.userId, input.userId))
      await tx.delete(userFragrance).where(eq(userFragrance.userId, input.userId))
      await prepareUserCatalogForAccountDeletion(tx, input.userId)
      await tx.delete(userProfile).where(eq(userProfile.userId, input.userId))
      await tx.delete(session).where(eq(session.userId, input.userId))
      await tx.delete(account).where(eq(account.userId, input.userId))

      const userLinkStateValue = `"userId":"${input.userId}"`
      const userLinkState = sql`strpos(${verification.value}, ${userLinkStateValue}) > 0`
      const verificationOwner = input.userEmail
        ? or(
            userLinkState,
            inArray(verification.identifier, [
              input.userEmail,
              input.userEmail.toLowerCase(),
              input.userEmail.toUpperCase(),
            ]),
          )
        : userLinkState

      await tx.delete(verification).where(verificationOwner)

      await tx.delete(user).where(eq(user.id, input.userId))
    }),
  )
}
