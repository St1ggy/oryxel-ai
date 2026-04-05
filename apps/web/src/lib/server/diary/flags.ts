export type FragranceFlags = {
  isTried: boolean
  isLiked: boolean
  isDisliked: boolean
  isOwned: boolean
}

export function listTypeToFlags(listType: string): FragranceFlags {
  if (listType === 'liked') return { isTried: true, isLiked: true, isDisliked: false, isOwned: false }

  if (listType === 'disliked') return { isTried: true, isLiked: false, isDisliked: true, isOwned: false }

  if (listType === 'neutral') return { isTried: true, isLiked: false, isDisliked: false, isOwned: false }

  if (listType === 'owned') return { isTried: false, isLiked: false, isDisliked: false, isOwned: true }

  return { isTried: false, isLiked: false, isDisliked: false, isOwned: false } // to_try
}
