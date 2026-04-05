import { detectFamily } from './families'

import type { DiaryData, DiaryRow, NoteRelationship, NoteRelationshipSentiment } from '$lib/types/diary'
import type { FamilyDefinition } from './families'
import type { NoteGraph, NoteLink, NoteNode } from './types'

export function parseNotes(string_: string | null): string[] {
  if (!string_) return []

  return string_
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
}

function scoreToSize(score: number, maxScore: number): number {
  if (maxScore === 0) return 20

  // Linear interpolation: min score → 18px, max score → 80px
  const t = Math.min(score / maxScore, 1)

  return Math.round(18 + t * 62)
}

/** Rating multiplier: 0 (unrated) → 1.0 neutral; 1 → 0.4; 3 → 1.0; 5 → 1.6 */
function ratingMult(rating: number): number {
  if (rating === 0) return 1

  return 0.4 + (rating - 1) * 0.3
}

/** User sentiment multiplier: reflects personal preference for this note */
const SENTIMENT_MULT: Record<NoteRelationshipSentiment, number> = {
  love: 2,
  like: 1.5,
  neutral: 1,
  dislike: 0.4,
  redflag: 0.15,
}

/** Layer multiplier: base notes persist longest and define the fragrance signature */
const TIER_MULT: Record<NoteNode['tier'], number> = {
  base: 1.5,
  heart: 1.2,
  top: 1,
  unknown: 1,
}

type ListEntry = {
  row: DiaryRow
  /** Fragrance status weight: liked=3, owned=2, neutral=1 */
  statusWeight: number
  /** Rating multiplier from ratingMult(row.rating) */
  ratingWeight: number
}

type NodeAccumulator = {
  name: string
  tier: NoteNode['tier']
  weightedScore: number
  fragrances: Set<number>
}

type LinkAccumulator = {
  source: string
  target: string
  weight: number
  fragrances: Set<number>
}

function accumulateNotes(entries: ListEntry[]): Map<string, NodeAccumulator> {
  const nodeMap = new Map<string, NodeAccumulator>()

  for (const { row, statusWeight, ratingWeight } of entries) {
    const tiers: [string | null, NoteNode['tier']][] = [
      [row.pyramidTop, 'top'],
      [row.pyramidMid, 'heart'],
      [row.pyramidBase, 'base'],
    ]

    for (const [string_, tier] of tiers) {
      for (const name of parseNotes(string_)) {
        const key = name.toLowerCase()
        const contribution = statusWeight * ratingWeight * TIER_MULT[tier]
        const existing = nodeMap.get(key)

        if (existing) {
          existing.weightedScore += contribution
          existing.fragrances.add(row.fragranceId)
        } else {
          nodeMap.set(key, { name, tier, weightedScore: contribution, fragrances: new Set([row.fragranceId]) })
        }
      }
    }
  }

  return nodeMap
}

function accumulateLinks(entries: ListEntry[], nodeMap: Map<string, NodeAccumulator>): Map<string, LinkAccumulator> {
  const linkMap = new Map<string, LinkAccumulator>()

  for (const { row, statusWeight, ratingWeight } of entries) {
    const contribution = statusWeight * ratingWeight
    const allNotes = [...parseNotes(row.pyramidTop), ...parseNotes(row.pyramidMid), ...parseNotes(row.pyramidBase)]
      .map((n) => n.toLowerCase())
      .filter((n) => nodeMap.has(n))

    const uniqueNotes = [...new Set(allNotes)]

    for (let index = 0; index < uniqueNotes.length; index++) {
      for (let index_ = index + 1; index_ < uniqueNotes.length; index_++) {
        const [a, b] = [uniqueNotes[index], uniqueNotes[index_]].toSorted((x, y) => (x < y ? -1 : 1))
        const key = `${a}|${b}`
        const existing = linkMap.get(key)

        if (existing) {
          existing.weight += contribution
          existing.fragrances.add(row.fragranceId)
        } else {
          linkMap.set(key, { source: a, target: b, weight: contribution, fragrances: new Set([row.fragranceId]) })
        }
      }
    }
  }

  return linkMap
}

export function buildNoteGraph(
  diaryData: DiaryData,
  noteRelationships: NoteRelationship[] = [],
  families?: FamilyDefinition[],
): NoteGraph {
  // Build a lookup map: note key → sentiment multiplier
  const sentimentMap = new Map<string, number>()

  for (const relationship of noteRelationships) {
    sentimentMap.set(relationship.note.toLowerCase(), SENTIMENT_MULT[relationship.sentiment] ?? 1)
  }

  const entries: ListEntry[] = [
    ...diaryData.liked.map((row) => ({ row, statusWeight: 3, ratingWeight: ratingMult(row.rating) })),
    ...diaryData.owned.map((row) => ({ row, statusWeight: 2, ratingWeight: ratingMult(row.rating) })),
    ...diaryData.neutral.map((row) => ({ row, statusWeight: 1, ratingWeight: ratingMult(row.rating) })),
  ]

  const nodeMap = accumulateNotes(entries)

  // Apply per-note sentiment multiplier after accumulation
  for (const [key, node] of nodeMap) {
    const sentMult = sentimentMap.get(key) ?? 1

    node.weightedScore *= sentMult
  }

  const maxScore = Math.max(0, ...[...nodeMap.values()].map((n) => n.weightedScore))

  const nodes: NoteNode[] = [...nodeMap.entries()].map(([id, data]) => {
    const { family, color } = detectFamily(data.name, families)

    return {
      id,
      name: data.name,
      tier: data.tier,
      family,
      color,
      size: scoreToSize(data.weightedScore, maxScore),
      weightedScore: data.weightedScore,
      fragrances: [...data.fragrances],
    }
  })

  const linkMap = accumulateLinks(entries, nodeMap)
  const links: NoteLink[] = [...linkMap.values()].map((l) => ({
    source: l.source,
    target: l.target,
    weight: l.weight,
    fragrances: [...l.fragrances],
  }))

  return { nodes, links, updatedAt: new Date().toISOString() }
}
