import { db, userFollow } from '@oryxel/db'
import { and, eq } from 'drizzle-orm'

import type { Visibility } from './types.js'

const RANK: Record<Visibility, number> = {
  private: 0,
  followers: 1,
  unlisted: 2,
  public: 3,
}

export function isVisibility(value: string): value is Visibility {
  return value === 'private' || value === 'followers' || value === 'public' || value === 'unlisted'
}

export async function isFollowing(followerId: string, followingId: string) {
  if (followerId === followingId) return true

  const [row] = await db
    .select({ id: userFollow.id })
    .from(userFollow)
    .where(and(eq(userFollow.followerId, followerId), eq(userFollow.followingId, followingId)))
    .limit(1)

  return row != null
}

export async function canView(viewerId: string | null, ownerId: string, visibility: Visibility) {
  if (visibility === 'private') {
    return viewerId === ownerId
  }

  if (viewerId === ownerId) return true

  if (visibility === 'public' || visibility === 'unlisted') return true

  if (visibility === 'followers') {
    if (!viewerId) return false

    return isFollowing(viewerId, ownerId)
  }

  return false
}

export function visibilityAtLeast(visibility: Visibility, minimum: Visibility) {
  return RANK[visibility] >= RANK[minimum]
}

export function slugifyTitle(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return base.length > 0 ? base : 'list'
}
