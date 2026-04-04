import { relations } from 'drizzle-orm'
import { boolean, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

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
})

export const userAiPreferences = pgTable('user_ai_preferences', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  tone: text('tone'),
  depth: text('depth'),
  rememberContext: boolean('remember_context').notNull().default(false),
  defaultProvider: text('default_provider'),
  defaultModelLabel: text('default_model_label'),
  platformAccess: boolean('platform_access').notNull().default(false),
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
    isLiked: boolean('is_liked'),
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

// Generic translation cache (content-addressable).
// key    = canonical English text stored in the fragrance / profile tables
// locale = target locale code (es, fr, jp, ru, zh)
// value  = translated text
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
