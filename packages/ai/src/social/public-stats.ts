import { db, userProfile } from '@oryxel/db'
import { eq } from 'drizzle-orm'

import { loadDiaryForUser } from '../diary/load.js'

import type { PublicDiaryStats } from './types.js'

/** Handles both new plain strings and old locale-map JSON (backward compat). */
function resolveStringOrMap(value: unknown, locale: string) {
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
    const map = value as Record<string, string>

    return map[locale] ?? map['en'] ?? Object.values(map)[0] ?? null
  }

  return null
}

function compactRadarLabel(raw: string, fallback: string) {
  const head = raw
    .split(/[,—–\-(]/u)[0]
    .trim()
    .slice(0, 24)

  return head.length > 0 ? head : fallback
}

function buildRadarAxes(radar: unknown, radarLabels: unknown, locale: string) {
  if (!radar || typeof radar !== 'object') return []

  const values = radar as Record<string, number>
  const labelsMap = (radarLabels ?? {}) as Record<string, unknown>

  return Object.entries(values).map(([key, value]) => {
    const raw = resolveStringOrMap(labelsMap[key], locale) ?? key

    return {
      key,
      value: typeof value === 'number' ? value : 0,
      label: compactRadarLabel(raw, key),
    }
  })
}

export async function loadPublicDiaryStats(userId: string, showDiaryStats: boolean, locale = 'en') {
  if (!showDiaryStats) return null

  const [profileRow] = await db.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1)

  if (!profileRow) return null

  const diary = await loadDiaryForUser(userId, locale)
  const diaryCounts = {
    owned: diary.owned.length,
    to_try: diary.to_try.length,
    liked: diary.liked.length,
    neutral: diary.neutral.length,
    disliked: diary.disliked.length,
  }
  const totalCount =
    diaryCounts.owned + diaryCounts.to_try + diaryCounts.liked + diaryCounts.neutral + diaryCounts.disliked

  return {
    archetype: resolveStringOrMap(profileRow.archetype, locale),
    favoriteNote: resolveStringOrMap(profileRow.favoriteNote, locale),
    radarAxes: buildRadarAxes(profileRow.radar, profileRow.radarLabels, locale),
    diaryCounts,
    totalCount,
  } satisfies PublicDiaryStats
}
