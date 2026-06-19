import { db, userFollow, userProfile } from '@oryxel/db'
import { and, count, desc, eq, isNotNull, lt } from 'drizzle-orm'

import type { FollowProfileHit } from './types.js'

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

export async function listFollowProfiles(
  userId: string,
  direction: 'followers' | 'following',
  viewerId: string | null,
  limit = 30,
  cursor?: number,
) {
  const pageSize = Math.min(Math.max(limit, 1), 50)
  const cursorFilter = cursor != null ? lt(userFollow.id, cursor) : undefined

  const rows =
    direction === 'followers'
      ? await db
          .select({
            followId: userFollow.id,
            userId: userProfile.userId,
            username: userProfile.username,
            displayName: userProfile.displayName,
            avatarUrl: userProfile.avatarUrl,
          })
          .from(userFollow)
          .innerJoin(userProfile, eq(userFollow.followerId, userProfile.userId))
          .where(and(eq(userFollow.followingId, userId), isNotNull(userProfile.username), cursorFilter))
          .orderBy(desc(userFollow.id))
          .limit(pageSize + 1)
      : await db
          .select({
            followId: userFollow.id,
            userId: userProfile.userId,
            username: userProfile.username,
            displayName: userProfile.displayName,
            avatarUrl: userProfile.avatarUrl,
          })
          .from(userFollow)
          .innerJoin(userProfile, eq(userFollow.followingId, userProfile.userId))
          .where(and(eq(userFollow.followerId, userId), isNotNull(userProfile.username), cursorFilter))
          .orderBy(desc(userFollow.id))
          .limit(pageSize + 1)

  const page = rows.slice(0, pageSize)
  const nextCursor = rows.length > pageSize ? rows[pageSize]?.followId : undefined
  const followingSet = viewerId ? new Set(await listFollowingIds(viewerId)) : null

  const profiles = page
    .filter((row): row is typeof row & { username: string } => row.username != null)
    .map(
      (row) =>
        ({
          userId: row.userId,
          username: row.username,
          displayName: row.displayName,
          avatarUrl: row.avatarUrl,
          isFollowing: followingSet ? followingSet.has(row.userId) : false,
        }) satisfies FollowProfileHit,
    )

  return { profiles, nextCursor }
}
