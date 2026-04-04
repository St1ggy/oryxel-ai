export type FragranceFlags = {
  isTried: boolean
  isLiked: boolean | null
  isOwned: boolean
}

export function listTypeToFlags(listType: string): FragranceFlags {
  if (listType === 'liked') return { isTried: true, isLiked: true, isOwned: false }

  if (listType === 'disliked') return { isTried: true, isLiked: false, isOwned: false }

  if (listType === 'neutral') return { isTried: true, isLiked: null, isOwned: false }

  if (listType === 'owned') return { isTried: false, isLiked: null, isOwned: true }

  return { isTried: false, isLiked: null, isOwned: false } // to_try
}
