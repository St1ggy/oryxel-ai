import { eq } from 'drizzle-orm'

import { db as database } from '../db'
import { brand, fragrance, userFragrance } from '../db/schema'

import type { DiaryRow, FragranceListType } from '$lib/types/diary'

function parseNotes(raw: string | null): string[] {
  if (!raw) {
    return []
  }

  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function resolveStatusLabel(raw: string | null, locale: string): string {
  if (!raw) return '—'

  if (raw.startsWith('{')) {
    try {
      const map = JSON.parse(raw) as Record<string, string>

      return map[locale] ?? map['en'] ?? Object.values(map)[0] ?? '—'
    } catch {
      // not a JSON map, fall through
    }
  }

  return raw
}

function toneForStatus(label: string | null): DiaryRow['statusTone'] {
  const l = (label ?? '').toLowerCase()

  if (l.includes('avoid') || l.includes('dislike')) {
    return 'destructive'
  }

  if (l.includes('love') || l.includes('signature')) {
    return 'success'
  }

  if (l.includes('sample') || l.includes('try')) {
    return 'accent'
  }

  if (l.includes('sweet') || l.includes('warn')) {
    return 'warning'
  }

  return 'neutral'
}

export async function loadDiaryForUser(userId: string, locale = 'en'): Promise<Record<FragranceListType, DiaryRow[]>> {
  try {
    const rows = await database
      .select({
        id: userFragrance.id,
        fragranceId: fragrance.id,
        rating: userFragrance.rating,
        isOwned: userFragrance.isOwned,
        isTried: userFragrance.isTried,
        isLiked: userFragrance.isLiked,
        isRecommendation: userFragrance.isRecommendation,
        statusLabel: userFragrance.statusLabel,
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

    const result: Record<FragranceListType, DiaryRow[]> = {
      // eslint-disable-next-line camelcase
      to_try: [],
      liked: [],
      disliked: [],
      owned: [],
    }

    for (const r of rows) {
      const row: DiaryRow = {
        id: r.id,
        fragranceId: r.fragranceId,
        brand: r.brandName,
        fragrance: r.fragName,
        notes: parseNotes(r.notesSummary),
        rating: r.rating,
        statusLabel: resolveStatusLabel(r.statusLabel, locale),
        statusTone: toneForStatus(r.statusLabel),
        isOwned: r.isOwned,
        isTried: r.isTried,
        isLiked: r.isLiked,
        isRecommendation: r.isRecommendation,
        pyramidTop: r.pyramidTop,
        pyramidMid: r.pyramidMid,
        pyramidBase: r.pyramidBase,
      }

      if (!r.isTried) result['to_try'].push(row)

      if (r.isTried && r.isLiked === true) result.liked.push(row)

      if (r.isTried && r.isLiked === false) result.disliked.push(row)

      if (r.isOwned) result.owned.push(row)
    }

    return result
  } catch (error) {
    console.error('[diary/load] Failed to load diary from database:', error)

    // eslint-disable-next-line camelcase
    return { to_try: [], liked: [], disliked: [], owned: [] }
  }
}
