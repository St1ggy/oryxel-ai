import { db, userFollow } from '@oryxel/db'
import { and, count, eq } from 'drizzle-orm'

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) return false

  const [row] = await db
    .insert(userFollow)
    .values({ followerId, followingId })
    .onConflictDoNothing()
    .returning({ id: userFollow.id })

  return row != null
}

export async function unfollowUser(followerId: string, followingId: string) {
  const result = await db
    .delete(userFollow)
    .where(and(eq(userFollow.followerId, followerId), eq(userFollow.followingId, followingId)))

  return (result.rowCount ?? 0) > 0
}

export async function getFollowCounts(userId: string) {
  const [followers] = await db.select({ count: count() }).from(userFollow).where(eq(userFollow.followingId, userId))

  const [following] = await db.select({ count: count() }).from(userFollow).where(eq(userFollow.followerId, userId))

  return {
    followers: Number(followers?.count ?? 0),
    following: Number(following?.count ?? 0),
  }
}

export async function listFollowerIds(userId: string) {
  const rows = await db
    .select({ followerId: userFollow.followerId })
    .from(userFollow)
    .where(eq(userFollow.followingId, userId))

  return rows.map((row) => row.followerId)
}

export async function listFollowingIds(userId: string) {
  const rows = await db
    .select({ followingId: userFollow.followingId })
    .from(userFollow)
    .where(eq(userFollow.followerId, userId))

  return rows.map((row) => row.followingId)
}
