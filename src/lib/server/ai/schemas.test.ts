import { describe, expect, it } from 'vitest'

import { analyzePreferencesRequestSchema, structuredPreferencePatchSchema } from './schemas'

describe('structuredPreferencePatchSchema', () => {
  it('parses a valid profile patch', () => {
    const parsed = structuredPreferencePatchSchema.parse({
      confidence: 0.87,
      summary: 'Profile update',
      profile: {
        archetype: {
          en: 'Modern classic',
          es: 'Clásico moderno',
          fr: 'Classique moderne',
          jp: 'モダンクラシック',
          ru: 'Современная классика',
          zh: '现代经典',
        },
        favoriteNote: { en: 'iris', es: 'iris', fr: 'iris', jp: 'アイリス', ru: 'ирис', zh: '鸢尾花' },
        radar: { woody: 85, citrus: 60, green: 40, spice: 30, sweet: 20 },
        radarLabels: {
          woody: { en: 'Woody', es: 'Leñoso', fr: 'Boisé', jp: 'ウッディ', ru: 'Древесный', zh: '木质' },
          citrus: { en: 'Citrus', es: 'Cítrico', fr: 'Citrus', jp: 'シトラス', ru: 'Цитрусовый', zh: '柑橘' },
        },
      },
      tableOps: [],
    })

    expect(parsed.profile?.favoriteNote).toEqual({
      en: 'iris',
      es: 'iris',
      fr: 'iris',
      jp: 'アイリス',
      ru: 'ирис',
      zh: '鸢尾花',
    })
    expect(parsed.confidence).toBeGreaterThan(0.8)
  })

  it('rejects invalid rating values', () => {
    expect(() =>
      structuredPreferencePatchSchema.parse({
        confidence: 0.8,
        summary: 'Bad op',
        tableOps: [{ op: 'rate', rowId: 3, rating: 8 }],
      }),
    ).toThrow()
  })
})

describe('analyzePreferencesRequestSchema', () => {
  it('applies defaults for locale and scenario', () => {
    const parsed = analyzePreferencesRequestSchema.parse({
      userId: 'u1',
      message: 'Help me choose',
    })

    expect(parsed.locale).toBe('en')
    expect(parsed.scenario).toBe('recommendation')
  })

  it('parses context payload', () => {
    const parsed = analyzePreferencesRequestSchema.parse({
      userId: 'u1',
      message: 'Find analogs',
      locale: 'es',
      scenario: 'analog',
      context: {
        profile: { favoriteNote: 'iris' },
        diary: { liked: [{ id: 1, brand: 'A', fragrance: 'A1' }] },
        budget: '100',
      },
    })

    expect(parsed.context?.profile?.favoriteNote).toBe('iris')
    expect(parsed.context?.diary?.liked?.length).toBe(1)
  })
})
