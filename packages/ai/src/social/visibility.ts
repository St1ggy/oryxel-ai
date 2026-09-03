import { db, userFollow } from '@oryxel/db'
import { and, eq } from 'drizzle-orm'

import type { Visibility } from './types.js'

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

export async function canDiscover(viewerId: string | null, ownerId: string, visibility: Visibility) {
  if (viewerId === ownerId) return true

  if (visibility === 'unlisted') return false

  return canView(viewerId, ownerId, visibility)
}

export function shouldNotifyFollowers(visibility: Visibility) {
  return visibility === 'followers' || visibility === 'public'
}

export function resolveVisibility(
  requested: Visibility | undefined,
  savedDefault: string | null | undefined,
  fallback: Visibility,
) {
  if (requested) return requested

  return savedDefault && isVisibility(savedDefault) ? savedDefault : fallback
}

export function slugifyTitle(title: string) {
  const normalized = title
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, '-')
  const base = normalized.replaceAll(/^-|-$/g, '').slice(0, 48)

  return base.length > 0 ? base : 'list'
}
