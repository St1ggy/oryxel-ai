import { brand, db, fragrance, userProfile } from '@oryxel/db'
import { and, eq, ilike, isNotNull, ne, or } from 'drizzle-orm'

type DatabaseExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

function escapeIlikePattern(input: string) {
  return input.replaceAll(/[%_\\]/g, String.raw`\$&`)
}

export async function searchFragrances(query: string, viewerId: string, limit = 20, executor: DatabaseExecutor = db) {
  const q = query.trim()

  if (q.length < 2) return []

  const pattern = `%${escapeIlikePattern(q)}%`

  const rows = await executor
    .select({
      fragranceId: fragrance.id,
      brandName: brand.name,
      fragranceName: fragrance.name,
      notesSummary: fragrance.notesSummary,
    })
    .from(fragrance)
    .innerJoin(brand, eq(fragrance.brandId, brand.id))
    .where(
      and(
        or(ilike(fragrance.name, pattern), ilike(brand.name, pattern), ilike(fragrance.notesSummary, pattern)),
        or(ne(fragrance.origin, 'user'), eq(fragrance.createdByUserId, viewerId)),
        or(ne(brand.origin, 'user'), eq(brand.createdByUserId, viewerId)),
      ),
    )
    .orderBy(brand.name, fragrance.name)
    .limit(Math.min(limit, 50))

  return rows
}

export async function searchFragrancesByQuery(
  query: string,
  viewerId: string,
  limit = 5,
  executor: DatabaseExecutor = db,
) {
  return searchFragrances(query, viewerId, limit, executor)
}

export async function searchUsers(query: string, limit = 20) {
  const q = query.trim().toLowerCase()

  if (q.length < 2) return []

  const pattern = `%${escapeIlikePattern(q)}%`

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
        isNotNull(userProfile.username),
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
