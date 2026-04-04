import { desc, eq } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { userActivityLog } from '$lib/server/db/schema'

export type ActivityEntry = {
  id: number
  action: string
  actor: 'user' | 'agent'
  provider: string | null
  summary: string
  createdAt: Date
}

export async function recordActivity(params: {
  userId: string
  action: string
  actor: 'user' | 'agent'
  provider?: string | null
  summary: string
}): Promise<void> {
  await db.insert(userActivityLog).values({
    userId: params.userId,
    action: params.action,
    actor: params.actor,
    provider: params.provider ?? null,
    summary: params.summary,
  })
}

export async function loadRecentActivity(userId: string, limit = 30): Promise<ActivityEntry[]> {
  const rows = await db
    .select()
    .from(userActivityLog)
    .where(eq(userActivityLog.userId, userId))
    .orderBy(desc(userActivityLog.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actor: row.actor as 'user' | 'agent',
    provider: row.provider,
    summary: row.summary,
    createdAt: row.createdAt,
  }))
}
