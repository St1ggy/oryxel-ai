import { brand, db, fragrance, userProfile } from '@oryxel/db'
import { and, eq, ilike, or, sql } from 'drizzle-orm'

import type { FragranceSearchHit, UserSearchHit } from './types.js'

export async function searchFragrances(query: string, limit = 20) {
  const q = query.trim()

  if (q.length < 2) return []

  const pattern = `%${q}%`

  const rows = await db
    .select({
      fragranceId: fragrance.id,
      brandName: brand.name,
      fragranceName: fragrance.name,
      notesSummary: fragrance.notesSummary,
    })
    .from(fragrance)
    .innerJoin(brand, eq(fragrance.brandId, brand.id))
    .where(or(ilike(fragrance.name, pattern), ilike(brand.name, pattern), ilike(fragrance.notesSummary, pattern)))
    .orderBy(brand.name, fragrance.name)
    .limit(Math.min(limit, 50))

  return rows
}

export async function searchFragrancesByQuery(query: string, limit = 5) {
  return searchFragrances(query, limit)
}

export async function searchUsers(query: string, limit = 20) {
  const q = query.trim().toLowerCase()

  if (q.length < 2) return []

  const pattern = `%${q}%`

  const rows = await db
    .select({
      userId: userProfile.userId,
      username: userProfile.username,
      displayName: userProfile.displayName,
      bio: userProfile.bio,
    })
    .from(userProfile)
    .where(
      and(
        eq(userProfile.isDiscoverable, true),
        sql`${userProfile.username} IS NOT NULL`,
        or(ilike(userProfile.username, pattern), ilike(userProfile.displayName, pattern)),
      ),
    )
    .limit(Math.min(limit, 50))

  return rows
    .filter((row): row is typeof row & { username: string } => row.username != null)
    .map((row) => ({
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      bio: row.bio,
    }))
}
