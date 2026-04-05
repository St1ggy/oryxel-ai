export type NoteNode = {
  id: string
  name: string
  /** Position in fragrance pyramid */
  tier: 'top' | 'heart' | 'base' | 'unknown'
  family: string
  color: string
  /** Radius in pixels (20–80) */
  size: number
  /** Weighted score: liked×3 + owned×2 + neutral×1 */
  weightedScore: number
  /** fragranceId values of fragrances containing this note */
  fragrances: number[]
  /** D3 simulation positions (set by force layout) */
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

export type NoteLink = {
  source: string | NoteNode
  target: string | NoteNode
  /** Sum of weights from fragrances containing both notes */
  weight: number
  /** fragranceId values creating this link */
  fragrances: number[]
}

export type NoteGraph = {
  nodes: NoteNode[]
  links: NoteLink[]
  updatedAt: string
}
