import { describe, expect, it } from 'vitest'

import { countStrippedPatchMutations, sanitizePatchForChatMode } from './decision'
import { inferSuggestedChatMode, shouldSuggestModeSwitch } from './mode-inference'

import type { StructuredPreferencePatch } from './contracts'

const basePatch = (): StructuredPreferencePatch => ({
  confidence: 0.9,
  summary: 'Updated diary',
  reply: 'Done',
  tableOps: [
    { op: 'add', brandName: 'Dior', fragranceName: 'Sauvage' },
    { op: 'remove', rowId: 1 },
  ],
  profile: { archetype: 'Woody explorer' },
  recommendations: [{ id: '1', brand: 'Chanel', name: 'Bleu', tag: 'fresh' }],
})

describe('sanitizePatchForChatMode', () => {
  it('ask mode keeps only conversational fields', () => {
    const sanitized = sanitizePatchForChatMode(basePatch(), 'ask')

    expect(sanitized.tableOps).toEqual([])
    expect(sanitized.profile).toBeUndefined()
    expect(sanitized.recommendations).toBeUndefined()
    expect(sanitized.reply).toBe('Done')
  })

  it('add mode filters non-add table ops', () => {
    const sanitized = sanitizePatchForChatMode(basePatch(), 'add')

    expect(sanitized.tableOps).toEqual([{ op: 'add', brandName: 'Dior', fragranceName: 'Sauvage' }])
    expect(sanitized.profile).toBeUndefined()
    expect(sanitized.recommendations?.length).toBe(1)
  })

  it('recommend mode strips profile and table ops', () => {
    const sanitized = sanitizePatchForChatMode(basePatch(), 'recommend')

    expect(sanitized.tableOps).toEqual([])
    expect(sanitized.profile).toBeUndefined()
    expect(sanitized.recommendations?.length).toBe(1)
  })
})

describe('countStrippedPatchMutations', () => {
  it('counts removed mutations after sanitization', () => {
    const original = basePatch()
    const sanitized = sanitizePatchForChatMode(original, 'ask')

    expect(countStrippedPatchMutations(original, sanitized)).toBeGreaterThan(0)
  })
})

describe('inferSuggestedChatMode', () => {
  it('detects ask intent in Russian', () => {
    expect(inferSuggestedChatMode('что такое oud?')).toBe('ask')
  })

  it('detects add intent in English', () => {
    expect(inferSuggestedChatMode('add Dior Sauvage to my collection')).toBe('add')
  })

  it('detects recommend intent', () => {
    expect(inferSuggestedChatMode('порекомендуй летние ароматы')).toBe('recommend')
  })

  it('detects agent intent for removals', () => {
    expect(inferSuggestedChatMode('удали всё из disliked')).toBe('agent')
  })
})

describe('shouldSuggestModeSwitch', () => {
  it('returns null when mode already matches', () => {
    expect(shouldSuggestModeSwitch('что такое oud?', 'ask')).toBeNull()
  })

  it('suggests add mode from ask', () => {
    const suggestion = shouldSuggestModeSwitch('добавь Sauvage в коллекцию', 'ask')

    expect(suggestion?.suggested).toBe('add')
  })
})
