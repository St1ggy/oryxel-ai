// Custom migration runner.
// - Creates __drizzle_migrations table if absent.
// - Skips migrations already recorded there.
// - Applies the rest in order, respecting --> statement-breakpoint.
//
// Usage:
//    bun --env-file=../../.env.development src/migrate.ts
//    bun --env-file=../../.env.production  src/migrate.ts
import { Pool, type PoolClient } from 'pg'

import { type MigrationFile, loadMigrations } from './migrations'

const MIGRATION_LOCK = 'oryxel:db:migrate'
const migrations = loadMigrations()
const migrationByTag = new Map(migrations.map((migration) => [migration.tag, migration]))

function resolveMigrationDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) throw new Error('DATABASE_URL is not set')

  const parsed = new URL(rawUrl)

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use postgres protocol')
  }

  if (
    parsed.hostname.endsWith('.railway.internal') ||
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]'
  ) {
    parsed.searchParams.set('sslmode', 'disable')
  } else {
    parsed.searchParams.set('sslmode', 'verify-full')
  }

  return parsed.href
}

const pool = new Pool({
  connectionString: resolveMigrationDatabaseUrl(process.env.DATABASE_URL),
})

async function prepareMigrationTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      checksum TEXT,
      created_at BIGINT
    )
  `)
  await client.query('ALTER TABLE "__drizzle_migrations" ADD COLUMN IF NOT EXISTS checksum TEXT')
  await client.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "__drizzle_migrations_hash_idx" ON "__drizzle_migrations" (hash)',
  )

  const { rows: applied } = await client.query<{ checksum: string | null; hash: string }>(
    'SELECT hash, checksum FROM "__drizzle_migrations"',
  )
  const appliedChecksums = new Map(applied.map((row) => [row.hash, row.checksum]))

  for (const tag of appliedChecksums.keys()) {
    if (!migrationByTag.has(tag)) {
      throw new Error(`Database contains an unknown migration: ${tag}`)
    }
  }

  for (const migration of migrations) {
    const appliedChecksum = appliedChecksums.get(migration.tag)

    if (appliedChecksum === undefined) continue

    if (appliedChecksum === null) {
      await client.query('UPDATE "__drizzle_migrations" SET checksum = $1 WHERE hash = $2', [
        migration.checksum,
        migration.tag,
      ])
    } else if (appliedChecksum !== migration.checksum) {
      throw new Error(`Applied migration was modified: ${migration.file}`)
    }
  }

  const appliedSet = new Set(appliedChecksums.keys())
  let foundGap = false

  for (const migration of migrations) {
    if (!appliedSet.has(migration.tag)) {
      foundGap = true
    } else if (foundGap) {
      throw new Error(`Database migration history is not a contiguous prefix at ${migration.tag}`)
    }
  }

  return appliedSet
}

async function recordMigration(client: PoolClient, migration: MigrationFile) {
  await client.query('INSERT INTO "__drizzle_migrations" (hash, checksum, created_at) VALUES ($1, $2, $3)', [
    migration.tag,
    migration.checksum,
    Date.now(),
  ])
}

async function markApplied(client: PoolClient, appliedSet: Set<string>, tag: string, reason: string) {
  const migration = migrationByTag.get(tag)

  if (!migration) throw new Error(`Migration file not found: ${tag}.sql`)

  await recordMigration(client, migration)
  appliedSet.add(tag)
  console.log(`mark  ${migration.file} (${reason})`)
}

async function markExplicitBaseline(client: PoolClient, appliedSet: Set<string>) {
  if (appliedSet.size > 0) return

  const { rows } = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name <> '__drizzle_migrations'
    ) AS exists
  `)

  if (!rows[0]?.exists) return

  const baselineTag = process.env.DATABASE_MIGRATION_BASELINE
  const baselineIndex = migrations.findIndex((migration) => migration.tag === baselineTag)

  if (baselineIndex === -1) {
    throw new Error(
      'Database has an existing schema but no migration history. Set DATABASE_MIGRATION_BASELINE to the last migration already represented by that schema.',
    )
  }

  for (const migration of migrations.slice(0, baselineIndex + 1)) {
    await markApplied(client, appliedSet, migration.tag, 'explicit db:push baseline')
  }
}

async function applyMigration(client: PoolClient, migration: MigrationFile) {
  const statements = migration.sql
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean)

  await client.query('BEGIN')

  try {
    for (const statement of statements) {
      await client.query(statement)
    }

    await recordMigration(client, migration)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

async function applyPendingMigrations(client: PoolClient, appliedSet: Set<string>) {
  for (const migration of migrations) {
    if (appliedSet.has(migration.tag)) {
      console.log(`skip  ${migration.file}`)
      continue
    }

    console.log(`apply ${migration.file}`)
    await applyMigration(client, migration)
    console.log(`done  ${migration.file}`)
  }
}

async function run() {
  const client = await pool.connect()
  let lockHeld = false

  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [MIGRATION_LOCK])
    lockHeld = true

    const appliedSet = await prepareMigrationTable(client)

    await markExplicitBaseline(client, appliedSet)
    await applyPendingMigrations(client, appliedSet)

    console.log('All migrations applied.')
  } finally {
    try {
      if (lockHeld) {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [MIGRATION_LOCK])
      }
    } finally {
      client.release()
      await pool.end()
    }
  }
}

await run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
