import { describe, expect, it } from 'vitest'

import { isCriticalPatch } from './decision'

describe('isCriticalPatch', () => {
  it('treats profile changes as critical', () => {
    expect(
      isCriticalPatch({
        confidence: 0.9,
        summary: 'Update archetype',
        profile: {
          archetype: {
            en: 'Explorer',
            es: 'Explorador',
            fr: 'Explorateur',
            jp: '探求者',
            ru: 'Исследователь',
            zh: '探索者',
          },
        },
        tableOps: [],
      }),
    ).toBe(true)
  })

  it('treats remove/move table ops as critical', () => {
    expect(
      isCriticalPatch({
        confidence: 0.7,
        summary: 'Move row',
        tableOps: [{ op: 'move', rowId: 10, listType: 'liked' }],
      }),
    ).toBe(true)
  })

  it('keeps minor rating changes non-critical', () => {
    expect(
      isCriticalPatch({
        confidence: 0.8,
        summary: 'Set rating',
        tableOps: [{ op: 'rate', rowId: 10, rating: 4 }],
      }),
    ).toBe(false)
  })
})
