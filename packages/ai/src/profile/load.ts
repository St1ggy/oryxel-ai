import { db, userFragrance, userProfile } from '@oryxel/db'
import { eq, sql } from 'drizzle-orm'

import { lookupTranslations } from '../translation/service'

import type { NoteRelationship, RadarAxes, RadarAxis } from '../types/diary'

/** Handles both new plain strings and old locale-map JSON (backward compat). */
// eslint-disable-next-line sonarjs/function-return-type
function resolveStringOrMap(value: unknown, locale: string): string | null {
  if (!value) return null

  if (typeof value === 'string') {
    if (value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value) as Record<string, string>

        return parsed[locale] ?? parsed['en'] ?? Object.values(parsed)[0] ?? value
      } catch {
        // not JSON, return as-is
      }
    }

    return value
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const m = value as Record<string, string>

    return m[locale] ?? m['en'] ?? Object.values(m)[0] ?? null
  }

  return null
}

function buildRadarAxes(radar: unknown, radarLabels: unknown, locale: string): RadarAxis[] {
  if (!radar || typeof radar !== 'object') return []

  const values = radar as RadarAxes
  const labelsMap = (radarLabels ?? {}) as Record<string, unknown>

  return Object.entries(values).map(([key, value]) => ({
    key,
    value: typeof value === 'number' ? value : 0,
    // radarLabels is now flat {axisKey: label}, but handle old nested format too
    label: resolveStringOrMap(labelsMap[key], locale) ?? key,
  }))
}

export async function loadProfileForUser(userId: string, fallbackName = 'User', locale = 'en') {
  const [profileRow] = await db.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1)

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userFragrance)
    .where(eq(userFragrance.userId, userId))

  const rawSuggestions = profileRow?.suggestions ?? []
  const suggestions = rawSuggestions
    .map((s) => (typeof s === 'string' ? s : resolveStringOrMap(s, locale)))
    .filter((s): s is string => s !== null)

  return {
    displayName: profileRow?.displayName ?? fallbackName,
    bio: profileRow?.bio ?? '',
    preferences: profileRow?.preferences ?? '',
    totalCount: countRow?.count ?? 0,
    favoriteNote: resolveStringOrMap(profileRow?.favoriteNote, locale),
    archetype: resolveStringOrMap(profileRow?.archetype, locale),
    radarAxes: buildRadarAxes(profileRow?.radar, profileRow?.radarLabels, locale),
    suggestions,
    gender: profileRow?.gender ?? null,
    noteRelationships: await (async () => {
      const raw = (profileRow?.noteRelationships ?? []) as NoteRelationship[]

      if (raw.length === 0) return raw

      const noteTranslations = await lookupTranslations(
        raw.map((n) => n.note),
        locale,
      )

      return raw.map((n) => ({
        ...n,
        translatedNote: noteTranslations.get(n.note) || undefined,
      }))
    })(),
  }
}
