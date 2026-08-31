import { db, fragrance, translations, userFragrance } from '@oryxel/db'
import { logError } from '@oryxel/runtime'
import { and, eq, inArray, sql } from 'drizzle-orm'

import { extractEnglishKey, saveTranslations } from './service'
import { translateBatch } from './translate'

const TRANSLATE_BATCH_SIZE = 30

function splitTerms(raw: string | null) {
  if (!raw) return []

  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function collectRowKeys(r: {
  notesSummary: string | null
  pyramidTop: string | null
  pyramidMid: string | null
  pyramidBase: string | null
}) {
  const phrases = [
    extractEnglishKey(r.notesSummary),
    extractEnglishKey(r.pyramidTop),
    extractEnglishKey(r.pyramidMid),
    extractEnglishKey(r.pyramidBase),
  ].filter((k): k is string => k !== null && k.length > 0)

  return phrases.flatMap((p) => splitTerms(p))
}

async function loadUserCanonicalKeys(userId: string) {
  const rows = await db
    .select({
      notesSummary: sql<string | null>`coalesce(${userFragrance.notesSummary}, ${fragrance.notesSummary})`,
      pyramidTop: sql<string | null>`coalesce(${userFragrance.pyramidTop}, ${fragrance.pyramidTop})`,
      pyramidMid: sql<string | null>`coalesce(${userFragrance.pyramidMid}, ${fragrance.pyramidMid})`,
      pyramidBase: sql<string | null>`coalesce(${userFragrance.pyramidBase}, ${fragrance.pyramidBase})`,
    })
    .from(userFragrance)
    .innerJoin(fragrance, eq(userFragrance.fragranceId, fragrance.id))
    .where(eq(userFragrance.userId, userId))

  const keySet = new Set<string>()

  for (const row of rows) {
    for (const key of collectRowKeys(row)) {
      keySet.add(key)
    }
  }

  return [...keySet]
}

async function findMissingKeys(keys: string[], locale: string) {
  if (keys.length === 0) return []

  const existing = await db
    .select({ key: translations.key })
    .from(translations)
    .where(and(inArray(translations.key, keys), eq(translations.locale, locale)))

  const existingSet = new Set(existing.map((r) => r.key))

  return keys.filter((k) => !existingSet.has(k))
}

function chunkArray<T>(array: T[], size: number) {
  const result: T[][] = []

  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size))
  }

  return result
}

// Finds all canonical English fragrance keys for a user that lack translations
// in the given locale, generates them via AI, and saves them to the DB.
// No-op for locale === 'en'.
export async function generateMissingTranslations(userId: string, locale: string) {
  if (locale === 'en') return

  try {
    const allKeys = await loadUserCanonicalKeys(userId)
    const missingKeys = await findMissingKeys(allKeys, locale)

    if (missingKeys.length === 0) return

    const batches = chunkArray(missingKeys, TRANSLATE_BATCH_SIZE)
    const entries: { key: string; locale: string; value: string }[] = []

    for (const batch of batches) {
      const batchResult = await translateBatch(userId, batch, locale)

      for (const [key, value] of batchResult) {
        entries.push({ key, locale, value })
      }
    }

    await saveTranslations(entries)
  } catch (error) {
    logError('ai', 'translation.generation_failed', error, { component: 'translation' })
  }
}
