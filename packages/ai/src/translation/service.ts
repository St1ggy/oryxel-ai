import { db, translations } from '@oryxel/db'
import { and, eq, inArray } from 'drizzle-orm'

// Batch-looks up cached translations for a set of canonical English keys + locale.
// Returns a map of key → translated text. Missing keys are absent from the map.
// For English locale always returns an empty map (no translation needed).
export async function lookupTranslations(keys: string[], locale: string): Promise<Map<string, string>> {
  if (locale === 'en' || keys.length === 0) return new Map()

  const unique = [...new Set(keys.filter(Boolean))]

  if (unique.length === 0) return new Map()

  const rows = await db
    .select({ key: translations.key, value: translations.value })
    .from(translations)
    .where(and(inArray(translations.key, unique), eq(translations.locale, locale)))

  return new Map(rows.map((r) => [r.key, r.value]))
}

// Resolves a comma-separated English field (e.g. "bergamot, lavender, musk") by looking up
// each individual term in the translation map and rejoining them.
// Falls back to the original term when no translation is found.
// Returns null when raw is null/empty.
export function resolveCommaSeparated(raw: string | null, map: Map<string, string>): string | null {
  if (!raw) return null

  return raw
    .split(',')
    .map((term) => {
      const t = term.trim()

      return t ? (map.get(t) ?? t) : t
    })
    .filter(Boolean)
    .join(', ')
}

// Persists a batch of translations.
// Skips keys that already have a cached translation (onConflictDoNothing).
export async function saveTranslations(entries: { key: string; locale: string; value: string }[]): Promise<void> {
  if (entries.length === 0) return

  await db.insert(translations).values(entries).onConflictDoNothing()
}

/** Extracts canonical English text from a stored value (plain text or legacy locale-map JSON). */
export function extractEnglishKey(raw: string | null): string | null {
  if (!raw) return null

  if (raw.startsWith('{')) {
    try {
      const map = JSON.parse(raw) as Record<string, string>

      return map['en'] ?? Object.values(map)[0] ?? null
    } catch {
      // not valid JSON
    }
  }

  return raw
}
