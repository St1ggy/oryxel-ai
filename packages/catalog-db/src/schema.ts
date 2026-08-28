import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const catalogLocale = pgEnum('catalog_locale', ['en', 'es', 'fr', 'ja', 'ru', 'zh'])
export const catalogEntityType = pgEnum('catalog_entity_type', ['brand', 'perfume'])
export const candidateOrigin = pgEnum('candidate_origin', ['ai', 'human'])
export const candidateStatus = pgEnum('candidate_status', ['pending', 'accepted', 'rejected', 'superseded'])
export const importBatchStatus = pgEnum('import_batch_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
])
export const importItemStatus = pgEnum('import_item_status', ['pending', 'imported', 'rejected', 'failed'])
export const moderationDecision = pgEnum('moderation_decision', ['accept', 'reject', 'request_changes'])

export const brands = pgTable('brand', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  retiredAt: timestamp('retired_at', { withTimezone: true }),
})

export const brandRevisions = pgTable(
  'brand_revision',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id')
      .references(() => brands.id, { onDelete: 'restrict' })
      .notNull(),
    revision: integer('revision').notNull(),
    canonicalName: text('canonical_name').notNull(),
    countryCode: text('country_code'),
    foundedYear: integer('founded_year'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    changeNote: text('change_note'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('brand_revision_brand_number_idx').on(table.brandId, table.revision),
    index('brand_revision_brand_created_idx').on(table.brandId, table.createdAt),
    check('brand_revision_positive_check', sql`${table.revision} > 0`),
  ],
)

export const perfumes = pgTable('perfume', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  retiredAt: timestamp('retired_at', { withTimezone: true }),
})

export const perfumeRevisions = pgTable(
  'perfume_revision',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    perfumeId: uuid('perfume_id')
      .references(() => perfumes.id, { onDelete: 'restrict' })
      .notNull(),
    revision: integer('revision').notNull(),
    brandId: uuid('brand_id')
      .references(() => brands.id, { onDelete: 'restrict' })
      .notNull(),
    canonicalName: text('canonical_name').notNull(),
    releaseYear: integer('release_year'),
    concentration: text('concentration'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    changeNote: text('change_note'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('perfume_revision_perfume_number_idx').on(table.perfumeId, table.revision),
    index('perfume_revision_perfume_created_idx').on(table.perfumeId, table.createdAt),
    index('perfume_revision_brand_idx').on(table.brandId),
    check('perfume_revision_positive_check', sql`${table.revision} > 0`),
  ],
)

export const brandAliases = pgTable(
  'brand_alias',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id')
      .references(() => brands.id, { onDelete: 'cascade' })
      .notNull(),
    locale: catalogLocale('locale').notNull(),
    alias: text('alias').notNull(),
    normalizedAlias: text('normalized_alias').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('brand_alias_target_locale_value_idx').on(table.brandId, table.locale, table.normalizedAlias),
  ],
)

export const perfumeAliases = pgTable(
  'perfume_alias',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    perfumeId: uuid('perfume_id')
      .references(() => perfumes.id, { onDelete: 'cascade' })
      .notNull(),
    locale: catalogLocale('locale').notNull(),
    alias: text('alias').notNull(),
    normalizedAlias: text('normalized_alias').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('perfume_alias_target_locale_value_idx').on(table.perfumeId, table.locale, table.normalizedAlias),
  ],
)

export const licensedSources = pgTable('licensed_source', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceKey: text('source_key').notNull().unique(),
  displayName: text('display_name').notNull(),
  licenseName: text('license_name').notNull(),
  licenseUrl: text('license_url'),
  termsUrl: text('terms_url'),
  attributionText: text('attribution_text'),
  allowsAiUse: boolean('allows_ai_use').notNull().default(false),
  allowsCommercialUse: boolean('allows_commercial_use').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const importBatches = pgTable(
  'import_batch',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .references(() => licensedSources.id, { onDelete: 'restrict' })
      .notNull(),
    externalKey: text('external_key').notNull(),
    status: importBatchStatus('status').notNull().default('pending'),
    requestedBy: text('requested_by').notNull(),
    statistics: jsonb('statistics').$type<Record<string, number>>().notNull().default({}),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('import_batch_source_external_idx').on(table.sourceId, table.externalKey),
    index('import_batch_status_created_idx').on(table.status, table.createdAt),
  ],
)

export const importItems = pgTable(
  'import_item',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    batchId: uuid('batch_id')
      .references(() => importBatches.id, { onDelete: 'cascade' })
      .notNull(),
    sequence: integer('sequence').notNull(),
    sourceRecordId: text('source_record_id').notNull(),
    entityType: catalogEntityType('entity_type').notNull(),
    status: importItemStatus('status').notNull().default('pending'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    contentHash: text('content_hash').notNull(),
    brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    perfumeId: uuid('perfume_id').references(() => perfumes.id, { onDelete: 'set null' }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('import_item_batch_sequence_idx').on(table.batchId, table.sequence),
    uniqueIndex('import_item_batch_source_record_idx').on(table.batchId, table.sourceRecordId),
    index('import_item_batch_status_idx').on(table.batchId, table.status),
    check('import_item_sequence_nonnegative_check', sql`${table.sequence} >= 0`),
    check(
      'import_item_entity_target_check',
      sql`(${table.entityType} = 'brand' AND ${table.perfumeId} IS NULL) OR (${table.entityType} = 'perfume')`,
    ),
  ],
)

export const factEvidence = pgTable(
  'fact_evidence',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .references(() => licensedSources.id, { onDelete: 'restrict' })
      .notNull(),
    importItemId: uuid('import_item_id').references(() => importItems.id, { onDelete: 'set null' }),
    brandRevisionId: uuid('brand_revision_id').references(() => brandRevisions.id, { onDelete: 'restrict' }),
    perfumeRevisionId: uuid('perfume_revision_id').references(() => perfumeRevisions.id, { onDelete: 'restrict' }),
    fieldKey: text('field_key').notNull(),
    locale: catalogLocale('locale'),
    sourceRecordId: text('source_record_id'),
    sourceUrl: text('source_url'),
    excerpt: text('excerpt'),
    value: jsonb('value').$type<unknown>().notNull(),
    contentHash: text('content_hash').notNull(),
    licenseSnapshot: jsonb('license_snapshot').$type<Record<string, unknown>>().notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('fact_evidence_source_record_idx').on(table.sourceId, table.sourceRecordId),
    index('fact_evidence_brand_revision_idx').on(table.brandRevisionId),
    index('fact_evidence_perfume_revision_idx').on(table.perfumeRevisionId),
    check(
      'fact_evidence_one_revision_check',
      sql`num_nonnulls(${table.brandRevisionId}, ${table.perfumeRevisionId}) = 1`,
    ),
  ],
)

export const localizedFieldCandidates = pgTable(
  'localized_field_candidate',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandRevisionId: uuid('brand_revision_id').references(() => brandRevisions.id, { onDelete: 'restrict' }),
    perfumeRevisionId: uuid('perfume_revision_id').references(() => perfumeRevisions.id, { onDelete: 'restrict' }),
    fieldKey: text('field_key').notNull(),
    locale: catalogLocale('locale').notNull(),
    value: text('value').notNull(),
    origin: candidateOrigin('origin').notNull(),
    status: candidateStatus('status').notNull().default('pending'),
    confidence: numeric('confidence', { precision: 5, scale: 4 }),
    aiProvider: text('ai_provider'),
    aiModel: text('ai_model'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('localized_candidate_moderation_queue_idx').on(table.status, table.locale, table.createdAt),
    uniqueIndex('localized_candidate_accepted_brand_idx')
      .on(table.brandRevisionId, table.fieldKey, table.locale)
      .where(sql`${table.status} = 'accepted' AND ${table.brandRevisionId} IS NOT NULL`),
    uniqueIndex('localized_candidate_accepted_perfume_idx')
      .on(table.perfumeRevisionId, table.fieldKey, table.locale)
      .where(sql`${table.status} = 'accepted' AND ${table.perfumeRevisionId} IS NOT NULL`),
    check(
      'localized_candidate_one_revision_check',
      sql`num_nonnulls(${table.brandRevisionId}, ${table.perfumeRevisionId}) = 1`,
    ),
    check(
      'localized_candidate_confidence_check',
      sql`${table.confidence} IS NULL OR (${table.confidence} >= 0 AND ${table.confidence} <= 1)`,
    ),
    check(
      'localized_candidate_ai_metadata_check',
      sql`${table.origin} = 'human' OR (${table.aiProvider} IS NOT NULL AND ${table.aiModel} IS NOT NULL)`,
    ),
  ],
)

export const localizedCandidateEvidence = pgTable(
  'localized_candidate_evidence',
  {
    candidateId: uuid('candidate_id')
      .references(() => localizedFieldCandidates.id, { onDelete: 'cascade' })
      .notNull(),
    evidenceId: uuid('evidence_id')
      .references(() => factEvidence.id, { onDelete: 'restrict' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('localized_candidate_evidence_pair_idx').on(table.candidateId, table.evidenceId)],
)

export const moderationReviews = pgTable(
  'moderation_review',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    candidateId: uuid('candidate_id')
      .references(() => localizedFieldCandidates.id, { onDelete: 'restrict' })
      .notNull(),
    decision: moderationDecision('decision').notNull(),
    reviewerId: text('reviewer_id').notNull(),
    rationale: text('rationale'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('moderation_review_candidate_created_idx').on(table.candidateId, table.createdAt)],
)

export const moderationAuditEvents = pgTable(
  'moderation_audit_event',
  {
    sequence: bigint('sequence', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: uuid('event_id').defaultRandom().notNull().unique(),
    reviewId: uuid('review_id').references(() => moderationReviews.id, { onDelete: 'restrict' }),
    actorId: text('actor_id').notNull(),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    before: jsonb('before').$type<Record<string, unknown>>(),
    after: jsonb('after').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('moderation_audit_target_idx').on(table.targetType, table.targetId, table.sequence)],
)

export const catalogOutbox = pgTable(
  'catalog_outbox',
  {
    sequence: bigint('sequence', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: uuid('event_id').defaultRandom().notNull().unique(),
    aggregateType: catalogEntityType('aggregate_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    revisionId: uuid('revision_id'),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
  },
  (table) => [
    index('catalog_outbox_pending_idx')
      .on(table.sequence)
      .where(sql`${table.publishedAt} IS NULL`),
    index('catalog_outbox_aggregate_idx').on(table.aggregateType, table.aggregateId, table.sequence),
    check('catalog_outbox_attempts_nonnegative_check', sql`${table.attempts} >= 0`),
  ],
)

export const brandRelations = relations(brands, ({ many }) => ({
  revisions: many(brandRevisions),
  aliases: many(brandAliases),
}))

export const brandRevisionRelations = relations(brandRevisions, ({ one, many }) => ({
  brand: one(brands, { fields: [brandRevisions.brandId], references: [brands.id] }),
  localizedCandidates: many(localizedFieldCandidates),
  evidence: many(factEvidence),
}))

export const perfumeRelations = relations(perfumes, ({ many }) => ({
  revisions: many(perfumeRevisions),
  aliases: many(perfumeAliases),
}))

export const perfumeRevisionRelations = relations(perfumeRevisions, ({ one, many }) => ({
  perfume: one(perfumes, { fields: [perfumeRevisions.perfumeId], references: [perfumes.id] }),
  brand: one(brands, { fields: [perfumeRevisions.brandId], references: [brands.id] }),
  localizedCandidates: many(localizedFieldCandidates),
  evidence: many(factEvidence),
}))

export const importBatchRelations = relations(importBatches, ({ one, many }) => ({
  source: one(licensedSources, { fields: [importBatches.sourceId], references: [licensedSources.id] }),
  items: many(importItems),
}))

export const localizedFieldCandidateRelations = relations(localizedFieldCandidates, ({ one, many }) => ({
  brandRevision: one(brandRevisions, {
    fields: [localizedFieldCandidates.brandRevisionId],
    references: [brandRevisions.id],
  }),
  perfumeRevision: one(perfumeRevisions, {
    fields: [localizedFieldCandidates.perfumeRevisionId],
    references: [perfumeRevisions.id],
  }),
  reviews: many(moderationReviews),
  evidenceLinks: many(localizedCandidateEvidence),
}))
