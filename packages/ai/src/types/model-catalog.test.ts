import { describe, expect, it } from 'vitest'

import { getDefaultModel, getModelLabel, resolveModel } from './model-catalog.js'

describe('model catalog', () => {
  it('returns default model per provider', () => {
    expect(getDefaultModel('openai')).toBe('gpt-5-mini')
    expect(getDefaultModel('anthropic')).toBe('claude-3-5-haiku-latest')
  })

  it('prefers override over env default', () => {
    expect(resolveModel('openai', 'gpt-4.1')).toBe('gpt-4.1')
  })

  it('resolves display label for known models', () => {
    expect(getModelLabel('openai', 'gpt-5-mini')).toBe('GPT-5 Mini')
  })
})
