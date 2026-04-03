import { and, eq, sql } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { userFragrance, userProfile } from '$lib/server/db/schema'

import type { RadarAxes, RadarAxis } from '$lib/types/diary'

function resolveLocaleValue(map: unknown, locale: string): string | null {
  if (!map || typeof map !== 'object') return null

  const m = map as Record<string, string>

  return m[locale] ?? m['en'] ?? Object.values(m)[0] ?? null
}

function buildRadarAxes(radar: unknown, radarLabels: unknown, locale: string): RadarAxis[] {
  if (!radar || typeof radar !== 'object') return []

  const values = radar as RadarAxes
  const labelsMap = (radarLabels ?? {}) as Record<string, unknown>

  return Object.entries(values).map(([key, value]) => ({
    key,
    value: typeof value === 'number' ? value : 0,
    label: resolveLocaleValue(labelsMap[key], locale) ?? key,
  }))
}

export async function loadProfileForUser(userId: string, fallbackName = 'User', locale = 'en') {
  const [profileRow] = await db.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1)

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userFragrance)
    .where(and(eq(userFragrance.userId, userId), eq(userFragrance.isOwned, true)))

  const suggestions = (profileRow?.suggestions ?? [])
    .map((s) => resolveLocaleValue(s, locale))
    .filter((s): s is string => s !== null)

  return {
    displayName: profileRow?.displayName ?? fallbackName,
    bio: profileRow?.bio ?? '',
    totalCount: countRow?.count ?? 0,
    favoriteNote: resolveLocaleValue(profileRow?.favoriteNote, locale),
    archetype: resolveLocaleValue(profileRow?.archetype, locale),
    radarAxes: buildRadarAxes(profileRow?.radar, profileRow?.radarLabels, locale),
    suggestions,
  }
}
