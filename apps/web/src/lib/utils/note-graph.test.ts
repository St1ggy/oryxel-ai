import { describe, expect, it } from 'vitest'

import { buildNoteGraph, detectFamily, parseNotes } from './note-graph/index'

import type { DiaryData, DiaryRow } from '$lib/types/diary'

// ---------------------------------------------------------------------------
// parseNotes
// ---------------------------------------------------------------------------

describe('parseNotes', () => {
  it('returns empty array for null', () => {
    expect(parseNotes(null)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parseNotes('')).toEqual([])
  })

  it('parses comma-separated notes', () => {
    expect(parseNotes('Bergamot, Lemon, Orange')).toEqual(['Bergamot', 'Lemon', 'Orange'])
  })

  it('trims whitespace', () => {
    expect(parseNotes('  Rose ,  Jasmine  ')).toEqual(['Rose', 'Jasmine'])
  })

  it('handles single note', () => {
    expect(parseNotes('Vetiver')).toEqual(['Vetiver'])
  })
})

// ---------------------------------------------------------------------------
// detectFamily
// ---------------------------------------------------------------------------

describe('detectFamily', () => {
  it('detects citrus family', () => {
    expect(detectFamily('Bergamot').family).toBe('citrus')
    expect(detectFamily('Lemon').family).toBe('citrus')
  })

  it('detects floral family', () => {
    expect(detectFamily('Rose').family).toBe('floral')
    expect(detectFamily('Jasmine').family).toBe('floral')
  })

  it('detects woody family', () => {
    expect(detectFamily('Cedarwood').family).toBe('woody')
    expect(detectFamily('Vetiver').family).toBe('woody')
  })

  it('falls back to other for unknown note', () => {
    expect(detectFamily('Xyznotanote').family).toBe('other')
    expect(detectFamily('Xyznotanote').color).toBe('#9E9E9E')
  })

  it('is case insensitive', () => {
    expect(detectFamily('BERGAMOT').family).toBe('citrus')
    expect(detectFamily('rose').family).toBe('floral')
  })
})

// ---------------------------------------------------------------------------
// buildNoteGraph
// ---------------------------------------------------------------------------

function makeRow(fragranceId: number, options: { top?: string; mid?: string; base?: string } = {}): DiaryRow {
  return {
    id: fragranceId,
    fragranceId,
    brand: 'Brand',
    fragrance: `Fragrance ${fragranceId}`,
    notes: [],
    rating: 0,
    agentComment: '',
    userComment: null,
    season: null,
    timeOfDay: null,
    gender: null,
    isOwned: false,
    isTried: false,
    isLiked: false,
    isDisliked: false,
    isRecommendation: false,
    pyramidTop: options.top ?? null,
    pyramidMid: options.mid ?? null,
    pyramidBase: options.base ?? null,
  }
}

const emptyDiary: DiaryData = {
  // eslint-disable-next-line camelcase
  to_try: [],
  liked: [],
  owned: [],
  neutral: [],
  disliked: [],
}

describe('buildNoteGraph', () => {
  it('returns empty graph for empty diary', () => {
    const g = buildNoteGraph(emptyDiary)

    expect(g.nodes).toHaveLength(0)
    expect(g.links).toHaveLength(0)
  })

  it('creates one node per unique note', () => {
    const g = buildNoteGraph({
      ...emptyDiary,
      liked: [makeRow(1, { top: 'Bergamot, Lemon', mid: 'Rose' }), makeRow(2, { top: 'Bergamot', base: 'Cedarwood' })],
    })

    // Bergamot, Lemon, Rose, Cedarwood → 4 nodes
    expect(g.nodes).toHaveLength(4)
    const ids = g.nodes.map((n) => n.id)

    expect(ids).toContain('bergamot')
    expect(ids).toContain('lemon')
    expect(ids).toContain('rose')
    expect(ids).toContain('cedarwood')
  })

  it('applies liked×3 weight', () => {
    const g = buildNoteGraph({
      ...emptyDiary,
      liked: [makeRow(1, { top: 'Bergamot' })],
    })
    const node = g.nodes.find((n) => n.id === 'bergamot')!

    expect(node.weightedScore).toBe(3)
  })

  it('applies owned×2 and neutral×1 weights', () => {
    const g = buildNoteGraph({
      ...emptyDiary,
      owned: [makeRow(1, { top: 'Rose' })],
      neutral: [makeRow(2, { top: 'Rose' })],
    })
    const node = g.nodes.find((n) => n.id === 'rose')!

    expect(node.weightedScore).toBe(3) // 2 + 1
  })

  it('accumulates fragrances per node', () => {
    const g = buildNoteGraph({
      ...emptyDiary,
      liked: [makeRow(10, { top: 'Bergamot' }), makeRow(11, { top: 'Bergamot' })],
    })
    const node = g.nodes.find((n) => n.id === 'bergamot')!

    expect(node.fragrances).toHaveLength(2)
    expect(node.fragrances).toContain(10)
    expect(node.fragrances).toContain(11)
  })

  it('creates links between co-occurring notes', () => {
    const g = buildNoteGraph({
      ...emptyDiary,
      liked: [makeRow(1, { top: 'Bergamot, Lemon' })],
    })

    expect(g.links).toHaveLength(1)
    const link = g.links[0]
    const source = typeof link.source === 'string' ? link.source : link.source.id
    const tgt = typeof link.target === 'string' ? link.target : link.target.id

    expect([source, tgt].toSorted((a, b) => (a < b ? -1 : 1))).toEqual(['bergamot', 'lemon'])
  })

  it('accumulates link weight across fragrances', () => {
    const g = buildNoteGraph({
      ...emptyDiary,
      liked: [
        makeRow(1, { top: 'Bergamot, Lemon' }), // weight 3
        makeRow(2, { top: 'Bergamot, Lemon' }), // weight 3
      ],
    })

    expect(g.links[0].weight).toBe(6)
  })

  it('assigns correct tier from pyramid position', () => {
    const g = buildNoteGraph({
      ...emptyDiary,
      liked: [makeRow(1, { top: 'Bergamot', mid: 'Rose', base: 'Vetiver' })],
    })

    expect(g.nodes.find((n) => n.id === 'bergamot')!.tier).toBe('top')
    expect(g.nodes.find((n) => n.id === 'rose')!.tier).toBe('heart')
    expect(g.nodes.find((n) => n.id === 'vetiver')!.tier).toBe('base')
  })

  it('assigns family and color to nodes', () => {
    const g = buildNoteGraph({
      ...emptyDiary,
      liked: [makeRow(1, { top: 'Bergamot' })],
    })
    const node = g.nodes.find((n) => n.id === 'bergamot')!

    expect(node.family).toBe('citrus')
    expect(node.color).toBe('#FFB347')
  })

  it('node size is at least 20 and at most 80', () => {
    const g = buildNoteGraph({
      ...emptyDiary,
      liked: [makeRow(1, { top: 'Bergamot, Lemon, Rose, Jasmine, Vetiver' })],
    })

    for (const node of g.nodes) {
      expect(node.size).toBeGreaterThanOrEqual(20)
      expect(node.size).toBeLessThanOrEqual(80)
    }
  })

  it('largest node by score gets size 80', () => {
    const rows = Array.from({ length: 5 }, (_, index) => makeRow(index + 1, { top: 'Bergamot, Lemon' }))
    const g = buildNoteGraph({ ...emptyDiary, liked: rows })
    const max = Math.max(...g.nodes.map((n) => n.size))

    expect(max).toBe(80)
  })
})
