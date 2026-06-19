import { relations } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export * from './auth.schema'

export const task = pgTable('task', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  priority: integer('priority').notNull().default(1),
})

export const brand = pgTable('brand', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
})

export const fragrance = pgTable('fragrance', {
  id: serial('id').primaryKey(),
  brandId: integer('brand_id')
    .references(() => brand.id)
    .notNull(),
  name: text('name').notNull(),
  pyramidTop: text('pyramid_top'),
  pyramidMid: text('pyramid_mid'),
  pyramidBase: text('pyramid_base'),
  notesSummary: text('notes_summary'),
})

export const userProfile = pgTable('user_profile', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  displayName: text('display_name'),
  bio: text('bio'),
  preferences: text('preferences'),
  avatarUrl: text('avatar_url'),
  archetype: text('archetype'),
  favoriteNote: text('favorite_note'),
  radar: jsonb('radar').$type<Record<string, number>>(),
  radarLabels: jsonb('radar_labels').$type<Record<string, string>>(),
  suggestions: jsonb('suggestions').$type<string[]>(),
  /** 'male' | 'female' | null — user gender for AI pronoun selection */
  gender: text('gender'),
  noteRelationships: jsonb('note_relationships').$type<{ note: string; sentiment: string; label: string }[]>(),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  /** Public handle @username — unique, lowercase */
  username: text('username'),
  /** When false, hidden from user search */
  isDiscoverable: boolean('is_discoverable').notNull().default(false),
  defaultListVisibility: text('default_list_visibility').notNull().default('private'),
  defaultPostVisibility: text('default_post_visibility').notNull().default('followers'),
  showDiaryStats: boolean('show_diary_stats').notNull().default(false),
},
(table) => [uniqueIndex('user_profile_username_idx').on(table.username)],
)

export const userAiPreferences = pgTable('user_ai_preferences', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  tone: text('tone'),
  depth: text('depth'),
  rememberContext: boolean('remember_context').notNull().default(false),
  defaultProvider: text('default_provider'),
  defaultModelLabel: text('default_model_label'),
  /** ask | agent | add | recommend — last selected chat interaction mode. */
  defaultChatMode: text('default_chat_mode').notNull().default('agent'),
  /** Model id for the active provider (e.g. gpt-5-mini). */
  defaultModelId: text('default_model_id'),
  platformAccess: boolean('platform_access').notNull().default(false),
  minPyramidNotes: integer('min_pyramid_notes').notNull().default(1),
  maxPyramidNotes: integer('max_pyramid_notes').notNull().default(5),
  minRecommendations: integer('min_recommendations').notNull().default(5),
  maxRecommendations: integer('max_recommendations').notNull().default(20),
  graphStyle: text('graph_style').notNull().default('default'),
  /** default | append (after built-in block) | replace (full system text; user message still appended). */
  systemPromptMode: text('system_prompt_mode').notNull().default('default'),
  systemPromptAppend: text('system_prompt_append'),
  systemPromptReplace: text('system_prompt_replace'),
})

export const userAiProviderKey = pgTable(
  'user_ai_provider_key',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    provider: text('provider').notNull(),
    label: text('label').notNull(),
    encryptedKey: text('encrypted_key').notNull(),
    keyIv: text('key_iv').notNull(),
    keyAuthTag: text('key_auth_tag').notNull(),
    keyVersion: text('key_version').notNull().default('v1'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_ai_provider_key_user_provider_label_idx').on(table.userId, table.provider, table.label),
  ],
)

export const userFragrance = pgTable(
  'user_fragrance',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    fragranceId: integer('fragrance_id')
      .references(() => fragrance.id)
      .notNull(),
    rating: integer('rating').notNull().default(0),
    isOwned: boolean('is_owned').notNull().default(false),
    isTried: boolean('is_tried').notNull().default(false),
    isLiked: boolean('is_liked').notNull().default(false),
    isDisliked: boolean('is_disliked').notNull().default(false),
    isRecommendation: boolean('is_recommendation').notNull().default(false),
    agentComment: text('agent_comment'),
    userComment: text('user_comment'),
    season: text('season'),
    timeOfDay: text('time_of_day'),
    gender: text('gender'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('user_fragrance_user_fragrance_idx').on(table.userId, table.fragranceId)],
)

/** Per-user list of fragrances the user has explicitly dismissed from AI recommendations. */
export const aiRecommendationDismissed = pgTable(
  'ai_recommendation_dismissed',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    fragranceId: integer('fragrance_id')
      .references(() => fragrance.id)
      .notNull(),
    reason: text('reason'),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('ai_rec_dismissed_user_frag').on(table.userId, table.fragranceId)],
)

export const userChatMessage = pgTable('user_chat_message', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  role: text('role').notNull(),
  encryptedContent: text('encrypted_content').notNull(),
  contentIv: text('content_iv').notNull(),
  contentAuthTag: text('content_auth_tag').notNull(),
  contentVersion: text('content_version').notNull().default('v1'),
  scenario: text('scenario'),
  locale: text('locale').notNull().default('en'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const aiPendingPatch = pgTable('ai_pending_patch', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  patchType: text('patch_type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  summary: text('summary'),
  confidence: integer('confidence'),
  status: text('status').notNull().default('created'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
})

export const aiPatchAuditLog = pgTable('ai_patch_audit_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  patchId: integer('patch_id').references(() => aiPendingPatch.id),
  action: text('action').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userActivityLog = pgTable('user_activity_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  /** 'patch_applied' | 'profile_synced' | 'entry_updated' | 'entry_deleted' */
  action: text('action').notNull(),
  /** 'user' or 'agent' */
  actor: text('actor').notNull().default('user'),
  /** AI provider id when actor='agent', e.g. 'openai', 'groq' */
  provider: text('provider'),
  /** Human-readable description in the user's locale */
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** User-managed long-term lines injected into the AI agent context. */
export const userAgentMemory = pgTable(
  'user_agent_memory',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    content: text('content').notNull(),
    /** 'user' | 'agent' — reserved for future auto-capture */
    source: text('source').notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('user_agent_memory_user_id_idx').on(table.userId)],
)

export const brandRelations = relations(brand, ({ many }) => ({
  fragrances: many(fragrance),
}))

export const fragranceRelations = relations(fragrance, ({ one, many }) => ({
  brand: one(brand, {
    fields: [fragrance.brandId],
    references: [brand.id],
  }),
  userEntries: many(userFragrance),
}))

export const userFragranceRelations = relations(userFragrance, ({ one }) => ({
  fragrance: one(fragrance, {
    fields: [userFragrance.fragranceId],
    references: [fragrance.id],
  }),
}))

export const aiPendingPatchRelations = relations(aiPendingPatch, ({ many }) => ({
  auditLog: many(aiPatchAuditLog),
}))

export const aiPatchAuditLogRelations = relations(aiPatchAuditLog, ({ one }) => ({
  patch: one(aiPendingPatch, {
    fields: [aiPatchAuditLog.patchId],
    references: [aiPendingPatch.id],
  }),
}))

export const backgroundJob = pgTable('background_job', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  /** 'profile_sync' | 'agent_chat' */
  type: text('type').notNull(),
  /** 'pending' | 'processing' | 'done' | 'failed' | 'cancelled' */
  status: text('status').notNull().default('pending'),
  /** Job parameters stored at creation time so the worker can execute without the HTTP request context */
  params: jsonb('params').$type<Record<string, unknown>>(),
  progress: jsonb('progress')
    .$type<
      {
        step: number
        total: number
        phase: string
        meta?: {
          provider?: string
          model?: string
          tokensIn?: number
          tokensOut?: number
          attempt?: number
          durationMs?: number
          scenario?: string
          note?: string
        }
      }[]
    >()
    .default([]),
  result: jsonb('result').$type<Record<string, unknown>>(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

// Generic translation cache (content-addressable).
// key    = canonical English text stored in the fragrance / profile tables
// locale = target locale code (es, fr, jp, ru, zh)
// value  = translated text
/** Note olfactive family — defines detection keywords, color, and display name translations. */
export const noteFamily = pgTable('note_family', {
  id: serial('id').primaryKey(),
  /** Stable machine key, e.g. 'citrus', 'floral', 'woody' */
  name: text('name').notNull().unique(),
  /** Hex display color for graph nodes, e.g. '#FFB347' */
  color: text('color').notNull(),
  /** List of lowercase keywords used for detection (substring match) */
  keywords: jsonb('keywords').$type<string[]>().notNull().default([]),
  /** Per-locale display names, e.g. {"en": "Citrus", "ru": "Цитрус"} */
  translations: jsonb('translations').$type<Record<string, string>>().notNull().default({}),
  /** Display order in the UI */
  sortOrder: integer('sort_order').notNull().default(0),
})

export const translations = pgTable(
  'translations',
  {
    id: serial('id').primaryKey(),
    key: text('key').notNull(),
    locale: text('locale').notNull(),
    value: text('value').notNull(),
  },
  (table) => [uniqueIndex('translations_key_locale_idx').on(table.key, table.locale)],
)

/** User-curated fragrance collections (custom catalog picks or diary slices). */
export const userList = pgTable(
  'user_list',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    /** custom | diary_slice */
    kind: text('kind').notNull().default('custom'),
    diaryFilter: jsonb('diary_filter').$type<{ listType: string }>(),
    /** private | followers | public | unlisted */
    visibility: text('visibility').notNull().default('private'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_list_user_slug_idx').on(table.userId, table.slug),
    index('user_list_user_id_idx').on(table.userId),
  ],
)

export const userListItem = pgTable(
  'user_list_item',
  {
    id: serial('id').primaryKey(),
    listId: integer('list_id')
      .references(() => userList.id, { onDelete: 'cascade' })
      .notNull(),
    fragranceId: integer('fragrance_id')
      .references(() => fragrance.id)
      .notNull(),
    userFragranceId: integer('user_fragrance_id').references(() => userFragrance.id),
    sortOrder: integer('sort_order').notNull().default(0),
    note: text('note'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_list_item_list_fragrance_idx').on(table.listId, table.fragranceId),
    index('user_list_item_list_id_idx').on(table.listId),
  ],
)

export const userFollow = pgTable(
  'user_follow',
  {
    id: serial('id').primaryKey(),
    followerId: text('follower_id').notNull(),
    followingId: text('following_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_follow_pair_idx').on(table.followerId, table.followingId),
    index('user_follow_following_id_idx').on(table.followingId),
  ],
)

export const post = pgTable(
  'post',
  {
    id: serial('id').primaryKey(),
    authorId: text('author_id').notNull(),
    body: text('body').notNull(),
    visibility: text('visibility').notNull().default('followers'),
    status: text('status').notNull().default('published'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('post_author_id_created_idx').on(table.authorId, table.createdAt)],
)

export const postAttachment = pgTable('post_attachment', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .references(() => post.id, { onDelete: 'cascade' })
    .notNull(),
  kind: text('kind').notNull(),
  entityId: integer('entity_id'),
  url: text('url'),
  meta: jsonb('meta').$type<Record<string, unknown>>(),
})

export const notification = pgTable(
  'notification',
  {
    id: serial('id').primaryKey(),
    recipientId: text('recipient_id').notNull(),
    actorId: text('actor_id'),
    type: text('type').notNull(),
    entityType: text('entity_type'),
    entityId: integer('entity_id'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notification_recipient_created_idx').on(table.recipientId, table.createdAt),
    index('notification_recipient_unread_idx').on(table.recipientId, table.readAt),
  ],
)

export const notificationPreference = pgTable(
  'notification_preference',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    type: text('type').notNull(),
    enabled: boolean('enabled').notNull().default(true),
  },
  (table) => [uniqueIndex('notification_preference_user_type_idx').on(table.userId, table.type)],
)

export const userListRelations = relations(userList, ({ many }) => ({
  items: many(userListItem),
}))

export const userListItemRelations = relations(userListItem, ({ one }) => ({
  list: one(userList, { fields: [userListItem.listId], references: [userList.id] }),
  fragrance: one(fragrance, { fields: [userListItem.fragranceId], references: [fragrance.id] }),
}))
