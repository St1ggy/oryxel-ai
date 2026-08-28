import { describe, expect, it } from 'vitest'

import { isCriticalPatch } from './decision'

describe('isCriticalPatch', () => {
  it('keeps profile changes non-critical', () => {
    expect(
      isCriticalPatch({
        confidence: 0.9,
        summary: 'Update archetype',
        profile: {
          archetype: 'Explorer',
        },
        tableOps: [],
      }),
    ).toBe(false)
  })

  it('keeps move table ops non-critical', () => {
    expect(
      isCriticalPatch({
        confidence: 0.7,
        summary: 'Move row',
        tableOps: [{ op: 'move', rowId: 10, isTried: true, isLiked: true }],
      }),
    ).toBe(false)
  })

  it('treats every destructive operation as critical', () => {
    expect(
      isCriticalPatch({
        confidence: 0.9,
        summary: 'Remove row',
        tableOps: [{ op: 'remove', rowId: 10 }],
      }),
    ).toBe(true)

    expect(
      isCriticalPatch({
        confidence: 0.9,
        summary: 'Remove memory',
        tableOps: [],
        agentMemoryOps: [{ op: 'remove', id: 10 }],
      }),
    ).toBe(true)

    expect(
      isCriticalPatch({
        confidence: 0.9,
        summary: 'Remove list item',
        tableOps: [],
        listOps: [{ op: 'remove', listId: 10, fragranceId: 20 }],
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
