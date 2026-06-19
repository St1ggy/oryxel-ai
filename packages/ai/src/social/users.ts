import { db, userFragrance, userProfile } from '@oryxel/db'
import { count, eq } from 'drizzle-orm'

import { getFollowCounts } from './follow.js'
import { isFollowing } from './visibility.js'

import type { PublicProfile } from './types.js'

export async function getProfileByUsername(username: string) {
  const [row] = await db
    .select({
      userId: userProfile.userId,
      username: userProfile.username,
      displayName: userProfile.displayName,
      bio: userProfile.bio,
      avatarUrl: userProfile.avatarUrl,
      archetype: userProfile.archetype,
      showDiaryStats: userProfile.showDiaryStats,
    })
    .from(userProfile)
    .where(eq(userProfile.username, username.toLowerCase()))
    .limit(1)

  if (!row?.username) return null

  return { ...row, username: row.username }
}

export async function loadPublicProfile(username: string, viewerId: string | null) {
  const profile = await getProfileByUsername(username)

  if (!profile) return null

  const counts = await getFollowCounts(profile.userId)

  let totalCount: number | null = null

  if (profile.showDiaryStats) {
    const [row] = await db
      .select({ count: count() })
      .from(userFragrance)
      .where(eq(userFragrance.userId, profile.userId))

    totalCount = Number(row?.count ?? 0)
  }

  const following = viewerId ? await isFollowing(viewerId, profile.userId) : false

  return {
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    archetype: profile.showDiaryStats ? profile.archetype : null,
    totalCount,
    isFollowing: following,
    followerCount: counts.followers,
    followingCount: counts.following,
  }
}

export async function updateSocialProfileFields(
  userId: string,
  fields: {
    username?: string
    isDiscoverable?: boolean
    defaultListVisibility?: string
    defaultPostVisibility?: string
    showDiaryStats?: boolean
  },
) {
  await db
    .insert(userProfile)
    .values({ userId, ...fields })
    .onConflictDoUpdate({ target: userProfile.userId, set: fields })
}

export async function getSocialProfileFields(userId: string) {
  const [row] = await db
    .select({
      username: userProfile.username,
      isDiscoverable: userProfile.isDiscoverable,
      defaultListVisibility: userProfile.defaultListVisibility,
      defaultPostVisibility: userProfile.defaultPostVisibility,
      showDiaryStats: userProfile.showDiaryStats,
    })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1)

  return row ?? null
}
