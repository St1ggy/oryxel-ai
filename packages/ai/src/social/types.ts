export const VISIBILITIES = ['private', 'followers', 'public', 'unlisted'] as const
export type Visibility = (typeof VISIBILITIES)[number]

export const LIST_KINDS = ['custom', 'diary_slice'] as const
export type ListKind = (typeof LIST_KINDS)[number]

export const NOTIFICATION_TYPES = ['new_post', 'new_follower', 'new_list'] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export type DiaryListType = 'to_try' | 'liked' | 'neutral' | 'disliked' | 'owned'

export type UserListRow = {
  id: number
  userId: string
  slug: string
  title: string
  description: string | null
  kind: ListKind
  diaryFilter: { listType: DiaryListType } | null
  visibility: Visibility
  createdAt: Date
  updatedAt: Date
  itemCount?: number
}

export type UserListItemRow = {
  id: number
  listId: number
  fragranceId: number
  userFragranceId: number | null
  sortOrder: number
  note: string | null
  brandName: string
  fragranceName: string
}

export type FragranceSearchHit = {
  fragranceId: number
  brandName: string
  fragranceName: string
  notesSummary: string | null
}

export type UserSearchHit = {
  userId: string
  username: string
  displayName: string | null
  bio: string | null
}

export type PublicProfile = {
  userId: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  archetype: string | null
  totalCount: number | null
  isFollowing: boolean
  followerCount: number
  followingCount: number
}

export type FeedPost = {
  id: number
  authorId: string
  authorUsername: string | null
  authorDisplayName: string | null
  body: string
  visibility: Visibility
  createdAt: Date
  attachments: { kind: string; entityId: number | null; url: string | null }[]
}

export type NotificationRow = {
  id: number
  type: NotificationType
  actorId: string | null
  entityType: string | null
  entityId: number | null
  payload: Record<string, unknown> | null
  readAt: Date | null
  createdAt: Date
  actorUsername: string | null
  actorDisplayName: string | null
}

export type ListOp = {
  op: 'create' | 'add' | 'remove' | 'set_visibility'
  listId?: number
  title?: string
  description?: string
  kind?: ListKind
  visibility?: Visibility
  diaryFilter?: { listType: DiaryListType }
  fragranceQuery?: string
  fragranceId?: number
  userFragranceId?: number
}
