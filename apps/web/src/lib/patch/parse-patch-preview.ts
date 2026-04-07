/** Defensive parse of AI patch JSON for human-readable UI (no Zod — tolerate partial/legacy shapes). */

export type ParsedTableOp = {
  op: string
  rowId?: number
  brandName?: string
  fragranceName?: string
  isOwned?: boolean
  isTried?: boolean
  isLiked?: boolean
  isDisliked?: boolean
  rating?: number
  notesSummary?: string
  pyramidTop?: string | null
  pyramidMid?: string | null
  pyramidBase?: string | null
  userComment?: string | null
  agentComment?: string
  season?: string
  timeOfDay?: string
  gender?: string
}

export type ParsedRec = {
  id: string
  brand: string
  name: string
  tag?: string
  notesSummary?: string
}

export type ParsedMemoryOp = {
  op: string
  id?: number
  content?: string
}

export type ParsedNoteRelationship = {
  note: string
  sentiment: string
  label: string
  agentComment?: string
}

export type PatchPreview = {
  summary?: string
  reply?: string
  confidence?: number
  tableOps: ParsedTableOp[]
  profile: {
    archetype?: string
    favoriteNote?: string
    preferences?: string
    rationale?: string
    radar?: Record<string, number>
    noteRelationships?: ParsedNoteRelationship[]
  } | null
  recommendations: ParsedRec[]
  suggestions: string[]
  agentMemoryOps: ParsedMemoryOp[]
}

const empty: PatchPreview = {
  tableOps: [],
  profile: null,
  recommendations: [],
  suggestions: [],
  agentMemoryOps: [],
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>

  return null
}

function number_(v: unknown): number | undefined {
  if (typeof v === 'number' && !Number.isNaN(v)) return v

  return undefined
}

function string_(v: unknown): string | undefined {
  if (typeof v === 'string' && v.length > 0) return v

  return undefined
}

function bool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v

  return undefined
}

function parseTableOps(raw: unknown): ParsedTableOp[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      const o = asRecord(item)

      if (!o) return null

      const row: ParsedTableOp = {
        op: string_(o['op']) ?? 'unknown',
        rowId: number_(o['rowId']),
        brandName: string_(o['brandName']),
        fragranceName: string_(o['fragranceName']),
        isOwned: bool(o['isOwned']),
        isTried: bool(o['isTried']),
        isLiked: bool(o['isLiked']),
        isDisliked: bool(o['isDisliked']),
        rating: number_(o['rating']),
        notesSummary: string_(o['notesSummary']),
        pyramidTop: o['pyramidTop'] === null ? null : string_(o['pyramidTop']),
        pyramidMid: o['pyramidMid'] === null ? null : string_(o['pyramidMid']),
        pyramidBase: o['pyramidBase'] === null ? null : string_(o['pyramidBase']),
        userComment: o['userComment'] === null ? null : string_(o['userComment']),
        agentComment: string_(o['agentComment']),
        season: string_(o['season']),
        timeOfDay: string_(o['timeOfDay']),
        gender: string_(o['gender']),
      }

      return row
    })
    .filter((x): x is ParsedTableOp => x != null)
}

function parseRadar(radarRaw: unknown): Record<string, number> | undefined {
  if (!radarRaw || typeof radarRaw !== 'object' || Array.isArray(radarRaw)) return undefined

  const radar: Record<string, number> = {}

  for (const [k, value] of Object.entries(radarRaw as Record<string, unknown>)) {
    const n = number_(value)

    if (n !== undefined) radar[k] = Math.round(n)
  }

  return Object.keys(radar).length > 0 ? radar : undefined
}

function parseNoteRelationships(nrRaw: unknown): ParsedNoteRelationship[] | undefined {
  if (!Array.isArray(nrRaw)) return undefined

  const list: ParsedNoteRelationship[] = []

  for (const row of nrRaw) {
    const r = asRecord(row)

    if (!r) continue

    const note = string_(r['note'])
    const sentiment = string_(r['sentiment'])
    const label = string_(r['label'])

    if (!note || !sentiment || !label) continue

    const entry: ParsedNoteRelationship = { note, sentiment, label }
    const ac = string_(r['agentComment'])

    if (ac) entry.agentComment = ac

    list.push(entry)
  }

  return list.length > 0 ? list : undefined
}

function parseProfile(prof: unknown): PatchPreview['profile'] {
  const p = asRecord(prof)

  if (!p) return null

  const radar = parseRadar(p['radar'])
  const noteRelationships = parseNoteRelationships(p['noteRelationships'])
  const archetype = string_(p['archetype'])
  const favoriteNote = string_(p['favoriteNote'])
  const preferences = string_(p['preferences'])
  const rationale = string_(p['rationale'])

  if (
    !archetype &&
    !favoriteNote &&
    !preferences &&
    !rationale &&
    !radar &&
    !(noteRelationships && noteRelationships.length > 0)
  ) {
    return null
  }

  return {
    archetype,
    favoriteNote,
    preferences,
    rationale,
    radar,
    noteRelationships,
  }
}

function parseRecommendations(raw: unknown): ParsedRec[] {
  if (!Array.isArray(raw)) return []

  const out: ParsedRec[] = []

  for (const item of raw) {
    const o = asRecord(item)

    if (!o) continue

    const id = string_(o['id'])
    const brand = string_(o['brand'])
    const name = string_(o['name'])

    if (!id || !brand || !name) continue

    const rec: ParsedRec = { id, brand, name }
    const tag = string_(o['tag'])
    const notesSummary = string_(o['notesSummary'])

    if (tag) rec.tag = tag

    if (notesSummary) rec.notesSummary = notesSummary

    out.push(rec)
  }

  return out
}

function parseSuggestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []

  return raw.map((s) => (typeof s === 'string' ? s : '')).filter(Boolean)
}

function parseMemoryOps(raw: unknown): ParsedMemoryOp[] {
  if (!Array.isArray(raw)) return []

  const out: ParsedMemoryOp[] = []

  for (const item of raw) {
    const o = asRecord(item)

    if (!o) continue

    const mem: ParsedMemoryOp = { op: string_(o['op']) ?? 'unknown' }
    const id = number_(o['id'])
    const content = string_(o['content'])

    if (id !== undefined) mem.id = id

    if (content) mem.content = content

    out.push(mem)
  }

  return out
}

export function parsePatchPreview(raw: unknown): PatchPreview {
  const root = asRecord(raw)

  if (!root) return { ...empty }

  return {
    summary: string_(root['summary']),
    reply: string_(root['reply']),
    confidence: number_(root['confidence']),
    tableOps: parseTableOps(root['tableOps']),
    profile: parseProfile(root['profile']),
    recommendations: parseRecommendations(root['recommendations']),
    suggestions: parseSuggestions(root['suggestions']),
    agentMemoryOps: parseMemoryOps(root['agentMemoryOps']),
  }
}

export function patchPreviewHasBody(p: PatchPreview): boolean {
  return (
    p.tableOps.length > 0 ||
    p.profile != null ||
    p.recommendations.length > 0 ||
    p.suggestions.length > 0 ||
    p.agentMemoryOps.length > 0 ||
    (p.reply != null && p.reply.length > 0)
  )
}
