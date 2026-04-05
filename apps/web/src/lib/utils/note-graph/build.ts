import { detectFamily } from './families'

import type { DiaryData, DiaryRow } from '$lib/types/diary'
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

  // Linear interpolation: 1 → 20px, maxScore → 80px
  const t = Math.min(score / maxScore, 1)

  return Math.round(20 + t * 60)
}

type ListEntry = {
  row: DiaryRow
  weight: number
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

  for (const { row, weight } of entries) {
    const tiers: [string | null, NoteNode['tier']][] = [
      [row.pyramidTop, 'top'],
      [row.pyramidMid, 'heart'],
      [row.pyramidBase, 'base'],
    ]

    for (const [string_, tier] of tiers) {
      for (const name of parseNotes(string_)) {
        const key = name.toLowerCase()
        const existing = nodeMap.get(key)

        if (existing) {
          existing.weightedScore += weight
          existing.fragrances.add(row.fragranceId)
        } else {
          nodeMap.set(key, { name, tier, weightedScore: weight, fragrances: new Set([row.fragranceId]) })
        }
      }
    }
  }

  return nodeMap
}

function accumulateLinks(entries: ListEntry[], nodeMap: Map<string, NodeAccumulator>): Map<string, LinkAccumulator> {
  const linkMap = new Map<string, LinkAccumulator>()

  for (const { row, weight } of entries) {
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
          existing.weight += weight
          existing.fragrances.add(row.fragranceId)
        } else {
          linkMap.set(key, { source: a, target: b, weight, fragrances: new Set([row.fragranceId]) })
        }
      }
    }
  }

  return linkMap
}

export function buildNoteGraph(diaryData: DiaryData): NoteGraph {
  const entries: ListEntry[] = [
    ...diaryData.liked.map((row) => ({ row, weight: 3 })),
    ...diaryData.owned.map((row) => ({ row, weight: 2 })),
    ...diaryData.neutral.map((row) => ({ row, weight: 1 })),
  ]

  const nodeMap = accumulateNotes(entries)
  const maxScore = Math.max(0, ...[...nodeMap.values()].map((n) => n.weightedScore))

  const nodes: NoteNode[] = [...nodeMap.entries()].map(([id, data]) => {
    const { family, color } = detectFamily(data.name)

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
