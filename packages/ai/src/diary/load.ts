import { brand, db as database, fragrance, userFragrance } from '@oryxel/db'
import { eq } from 'drizzle-orm'

import { extractEnglishKey, lookupTranslations, resolveCommaSeparated } from '../translation/service'

import type { DiaryData, DiaryRow } from '../types/diary'

function parseNotes(raw: string | null): string[] {
  if (!raw) return []

  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Collects all individual term keys (split by comma) from a raw DB row for batch translation lookup. */
function collectKeys(r: {
  notesSummary: string | null
  pyramidTop: string | null
  pyramidMid: string | null
  pyramidBase: string | null
}): string[] {
  const phrases = [
    extractEnglishKey(r.notesSummary),
    extractEnglishKey(r.pyramidTop),
    extractEnglishKey(r.pyramidMid),
    extractEnglishKey(r.pyramidBase),
  ].filter((k): k is string => k !== null && k.length > 0)

  return phrases.flatMap((p) =>
    p
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  )
}

function buildDiaryRow(
  r: {
    id: number
    fragranceId: number
    rating: number
    isOwned: boolean
    isTried: boolean
    isLiked: boolean
    isDisliked: boolean
    agentComment: string | null
    userComment: string | null
    season: string | null
    timeOfDay: string | null
    gender: string | null
    fragName: string
    brandName: string
    notesSummary: string | null
    pyramidTop: string | null
    pyramidMid: string | null
    pyramidBase: string | null
  },
  translations: Map<string, string>,
): DiaryRow {
  return {
    id: r.id,
    fragranceId: r.fragranceId,
    brand: r.brandName,
    fragrance: r.fragName,
    notes: parseNotes(resolveCommaSeparated(extractEnglishKey(r.notesSummary), translations)),
    rating: r.rating,
    agentComment: r.agentComment ?? '',
    userComment: r.userComment,
    season: r.season,
    timeOfDay: r.timeOfDay,
    gender: r.gender,
    isOwned: r.isOwned,
    isTried: r.isTried,
    isLiked: r.isLiked,
    isDisliked: r.isDisliked,
    pyramidTop: resolveCommaSeparated(extractEnglishKey(r.pyramidTop), translations),
    pyramidMid: resolveCommaSeparated(extractEnglishKey(r.pyramidMid), translations),
    pyramidBase: resolveCommaSeparated(extractEnglishKey(r.pyramidBase), translations),
  }
}

export async function loadDiaryForUser(userId: string, locale = 'en'): Promise<DiaryData> {
  try {
    const rows = await database
      .select({
        id: userFragrance.id,
        fragranceId: fragrance.id,
        rating: userFragrance.rating,
        isOwned: userFragrance.isOwned,
        isTried: userFragrance.isTried,
        isLiked: userFragrance.isLiked,
        isDisliked: userFragrance.isDisliked,
        agentComment: userFragrance.agentComment,
        userComment: userFragrance.userComment,
        season: userFragrance.season,
        timeOfDay: userFragrance.timeOfDay,
        gender: userFragrance.gender,
        fragName: fragrance.name,
        brandName: brand.name,
        notesSummary: fragrance.notesSummary,
        pyramidTop: fragrance.pyramidTop,
        pyramidMid: fragrance.pyramidMid,
        pyramidBase: fragrance.pyramidBase,
      })
      .from(userFragrance)
      .innerJoin(fragrance, eq(userFragrance.fragranceId, fragrance.id))
      .innerJoin(brand, eq(fragrance.brandId, brand.id))
      .where(eq(userFragrance.userId, userId))

    // Collect all canonical English keys then batch-lookup translations
    const allKeys = rows.flatMap((r) => collectKeys(r))
    const translationsMap = await lookupTranslations(allKeys, locale)

    const result: DiaryData = {
      to_try: [],
      liked: [],
      neutral: [],
      disliked: [],
      owned: [],
    }

    for (const r of rows) {
      const row = buildDiaryRow(r, translationsMap)

      if (!r.isTried && !r.isOwned) result['to_try'].push(row)

      if (r.isTried && r.isLiked) result.liked.push(row)

      if (r.isTried && !r.isLiked && !r.isDisliked) result.neutral.push(row)

      if (r.isTried && r.isDisliked) result.disliked.push(row)

      if (r.isOwned) result.owned.push(row)
    }

    return result
  } catch (error) {
    console.error('[diary/load] Failed to load diary from database:', error)

    return { to_try: [], liked: [], neutral: [], disliked: [], owned: [] }
  }
}
