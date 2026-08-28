export const CANONICAL_LOCALES = ['en', 'es', 'fr', 'ja', 'ru', 'zh'] as const

export type CanonicalLocale = (typeof CANONICAL_LOCALES)[number]

export function normalizeLocale(locale: string) {
  if (locale === 'jp') return 'ja'

  return locale.startsWith('jp-') ? `ja-${locale.slice(3)}` : locale
}

export function getLocaleMapValue<T>(values: Readonly<Record<string, T>>, locale: string) {
  const normalizedLocale = normalizeLocale(locale)

  return values[normalizedLocale] ?? (normalizedLocale === 'ja' ? values['jp'] : undefined)
}
