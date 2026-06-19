import { db, notification, notificationPreference, userProfile } from '@oryxel/db'
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm'

import type { NotificationRow, NotificationType } from './types.js'

export async function isNotificationEnabled(userId: string, type: NotificationType) {
  const [pref] = await db
    .select({ enabled: notificationPreference.enabled })
    .from(notificationPreference)
    .where(and(eq(notificationPreference.userId, userId), eq(notificationPreference.type, type)))
    .limit(1)

  return pref?.enabled ?? true
}

export async function createNotification(input: {
  recipientId: string
  actorId?: string | null
  type: NotificationType
  entityType?: string
  entityId?: number
  payload?: Record<string, unknown>
}) {
  if (!(await isNotificationEnabled(input.recipientId, input.type))) return

  await db.insert(notification).values({
    recipientId: input.recipientId,
    actorId: input.actorId ?? null,
    type: input.type,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    payload: input.payload ?? null,
  })
}

export async function createNotificationsBatch(
  recipients: string[],
  input: Omit<Parameters<typeof createNotification>[0], 'recipientId'>,
) {
  for (const recipientId of recipients) {
    await createNotification({ ...input, recipientId })
  }
}

export async function listNotifications(userId: string, limit = 50) {
  const rows = await db
    .select({
      id: notification.id,
      type: notification.type,
      actorId: notification.actorId,
      entityType: notification.entityType,
      entityId: notification.entityId,
      payload: notification.payload,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      actorUsername: userProfile.username,
      actorDisplayName: userProfile.displayName,
    })
    .from(notification)
    .leftJoin(userProfile, eq(notification.actorId, userProfile.userId))
    .where(eq(notification.recipientId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    type: row.type as NotificationType,
    actorId: row.actorId,
    entityType: row.entityType,
    entityId: row.entityId,
    payload: row.payload as Record<string, unknown> | null,
    readAt: row.readAt,
    createdAt: row.createdAt,
    actorUsername: row.actorUsername,
    actorDisplayName: row.actorDisplayName,
  }))
}

export async function countUnreadNotifications(userId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(notification)
    .where(and(eq(notification.recipientId, userId), isNull(notification.readAt)))

  return Number(row?.count ?? 0)
}

export async function markNotificationsRead(userId: string, ids?: number[]) {
  const now = new Date()

  if (ids?.length) {
    await db
      .update(notification)
      .set({ readAt: now })
      .where(and(eq(notification.recipientId, userId), inArray(notification.id, ids)))

    return
  }

  await db
    .update(notification)
    .set({ readAt: now })
    .where(and(eq(notification.recipientId, userId), isNull(notification.readAt)))
}

export async function getNotificationPreferences(userId: string) {
  const rows = await db
    .select({ type: notificationPreference.type, enabled: notificationPreference.enabled })
    .from(notificationPreference)
    .where(eq(notificationPreference.userId, userId))

  return rows.map((row) => ({ type: row.type as NotificationType, enabled: row.enabled }))
}

export async function setNotificationPreference(userId: string, type: NotificationType, enabled: boolean) {
  await db
    .insert(notificationPreference)
    .values({ userId, type, enabled })
    .onConflictDoUpdate({
      target: [notificationPreference.userId, notificationPreference.type],
      set: { enabled },
    })
}
