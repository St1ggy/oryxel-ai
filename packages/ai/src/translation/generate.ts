import { db, fragrance, translations, userFragrance } from '@oryxel/db'
import { and, eq, inArray } from 'drizzle-orm'

import { extractEnglishKey, saveTranslations } from './service'
import { translateBatch } from './translate'

const TRANSLATE_BATCH_SIZE = 30

function splitTerms(raw: string | null): string[] {
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
}): string[] {
  const phrases = [
    extractEnglishKey(r.notesSummary),
    extractEnglishKey(r.pyramidTop),
    extractEnglishKey(r.pyramidMid),
    extractEnglishKey(r.pyramidBase),
  ].filter((k): k is string => k !== null && k.length > 0)

  return phrases.flatMap((p) => splitTerms(p))
}

async function loadUserCanonicalKeys(userId: string): Promise<string[]> {
  const rows = await db
    .select({
      notesSummary: fragrance.notesSummary,
      pyramidTop: fragrance.pyramidTop,
      pyramidMid: fragrance.pyramidMid,
      pyramidBase: fragrance.pyramidBase,
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

async function findMissingKeys(keys: string[], locale: string): Promise<string[]> {
  if (keys.length === 0) return []

  const existing = await db
    .select({ key: translations.key })
    .from(translations)
    .where(and(inArray(translations.key, keys), eq(translations.locale, locale)))

  const existingSet = new Set(existing.map((r) => r.key))

  return keys.filter((k) => !existingSet.has(k))
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = []

  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size))
  }

  return result
}

// Finds all canonical English fragrance keys for a user that lack translations
// in the given locale, generates them via AI, and saves them to the DB.
// No-op for locale === 'en'.
export async function generateMissingTranslations(userId: string, locale: string): Promise<void> {
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
    console.error(
      '[translation/generate] generateMissingTranslations failed:',
      error instanceof Error ? error.message : error,
    )
  }
}
