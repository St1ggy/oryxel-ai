export type FragranceListType = 'to_try' | 'liked' | 'neutral' | 'disliked' | 'owned'

export type NoteRelationshipSentiment = 'love' | 'like' | 'neutral' | 'dislike' | 'redflag'

export type NoteRelationship = {
  note: string
  sentiment: NoteRelationshipSentiment
  label: string
  /** User manually set this sentiment — agent must not modify it. */
  lockedByUser?: boolean
  /** Agent's short description of the note (character, typical use). */
  agentComment?: string
  /** Translated note name resolved at load time — not persisted. */
  translatedNote?: string
}

export type DiaryData = {
  to_try: DiaryRow[]
  liked: DiaryRow[]
  neutral: DiaryRow[]
  disliked: DiaryRow[]
  owned: DiaryRow[]
}

export type DiaryRow = {
  id: number
  fragranceId: number
  brand: string
  fragrance: string
  notes: string[]
  rating: number
  agentComment: string
  userComment: string | null
  season: string | null
  timeOfDay: string | null
  gender: string | null
  isOwned: boolean
  isTried: boolean
  isLiked: boolean
  isDisliked: boolean
  pyramidTop: string | null
  pyramidMid: string | null
  pyramidBase: string | null
}

/** Mobile shell: chat | tables (lists) | profile — matches Figma bottom nav */
export type DiaryMobileTab = 'chat' | 'lists' | 'profile'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type ActivityEntry = {
  id: number
  action: string
  actor: 'user' | 'agent'
  provider: string | null
  summary: string
  createdAt: Date
}

/** Axis key → value 0-100. Keys are chosen by AI per user profile. */
export type RadarAxes = Record<string, number>

/** Combined display model with localized label. */
export type RadarAxis = {
  key: string
  value: number
  label: string
}
