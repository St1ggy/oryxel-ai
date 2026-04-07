import { buildPrompt } from '@oryxel/ai'
import { describe, expect, it } from 'vitest'

describe('buildPrompt', () => {
  it('includes locale-specific language directive', () => {
    const prompt = buildPrompt({
      userId: 'u1',
      message: 'Need recommendations for spring',
      locale: 'ru',
      scenario: 'recommendation',
    })

    expect(prompt).toContain('Russian')
    expect(prompt).toContain('USER DISPLAY LIMITS')
  })

  it('includes context and scenario blocks', () => {
    const prompt = buildPrompt({
      userId: 'u1',
      message: 'Compare these two options',
      locale: 'en',
      scenario: 'comparison',
      context: {
        diary: {
          liked: [{ id: 1, brand: 'Brand A', fragrance: 'Scent A' }],
          disliked: [{ id: 2, brand: 'Brand B', fragrance: 'Scent B' }],
        },
        budget: '$150',
      },
    })

    expect(prompt).toContain('Scenario: comparison')
    expect(prompt).toContain('"$150"')
    expect(prompt).toContain('liked')
    expect(prompt).toContain('disliked')
  })
})
