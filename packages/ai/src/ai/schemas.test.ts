import { describe, expect, it } from 'vitest'

import { structuredPreferencePatchSchema } from './schemas'

describe('structuredPreferencePatchSchema', () => {
  it('coerces a numeric recommendation id to string', () => {
    const parsed = structuredPreferencePatchSchema.parse({
      confidence: 0.5,
      summary: 'Test',
      recommendations: [{ id: 42, brand: 'Brand', name: 'Frag', tag: 'tag' }],
      tableOps: [],
    })

    expect(parsed.recommendations?.[0]?.id).toBe('42')
  })

  it('keeps a string recommendation id unchanged', () => {
    const parsed = structuredPreferencePatchSchema.parse({
      confidence: 0.5,
      summary: 'Test',
      recommendations: [{ id: 'rec-amber', brand: 'Brand', name: 'Frag', tag: 'tag' }],
      tableOps: [],
    })

    expect(parsed.recommendations?.[0]?.id).toBe('rec-amber')
  })
})
