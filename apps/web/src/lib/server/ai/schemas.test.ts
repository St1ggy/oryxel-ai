import { describe, expect, it } from 'vitest'

import { analyzePreferencesRequestSchema, structuredPreferencePatchSchema } from './schemas'

describe('structuredPreferencePatchSchema', () => {
  it('parses a valid profile patch', () => {
    const parsed = structuredPreferencePatchSchema.parse({
      confidence: 0.87,
      summary: 'Profile update',
      profile: {
        archetype: 'Modern classic',
        favoriteNote: 'iris',
        radar: { woody: 85, citrus: 60, green: 40, spice: 30, sweet: 20 },
        radarLabels: {
          woody: 'Woody',
          citrus: 'Citrus',
        },
      },
      tableOps: [],
    })

    expect(parsed.profile?.favoriteNote).toBe('iris')
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

  it('normalizes the legacy Japanese locale', () => {
    const parsed = analyzePreferencesRequestSchema.parse({
      userId: 'u1',
      message: 'Help me choose',
      locale: 'jp',
    })

    expect(parsed.locale).toBe('ja')
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
