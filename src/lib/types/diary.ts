export type FragranceListType = 'to_try' | 'liked' | 'disliked' | 'owned'

export type DiaryRow = {
  id: number
  fragranceId: number
  brand: string
  fragrance: string
  notes: string[]
  rating: number
  statusLabel: string
  statusTone: 'neutral' | 'success' | 'warning' | 'destructive' | 'accent'
  isOwned: boolean
  isTried: boolean
  isLiked: boolean | null
  isRecommendation: boolean
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

/** Axis key → value 0-100. Keys are chosen by AI per user profile. */
export type RadarAxes = Record<string, number>

/** Combined display model with localized label. */
export type RadarAxis = {
  key: string
  value: number
  label: string
}
