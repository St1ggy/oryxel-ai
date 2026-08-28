import postgres from 'postgres'

import { isLocalCatalogDatabase, resolveCatalogDatabaseUrl } from './index'
import { loadMigrations } from './migrations'

const databaseUrl = resolveCatalogDatabaseUrl(process.env['CATALOG_DATABASE_URL'])
const client = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  ssl: isLocalCatalogDatabase(databaseUrl) ? false : 'verify-full',
})
const MIGRATION_LOCK = 'oryxel:catalog-db:migrate'
const migrations = loadMigrations()
const migrationByTag = new Map(migrations.map((migration) => [migration.tag, migration]))
let lockHeld = false

try {
  await client`SELECT pg_advisory_lock(hashtext(${MIGRATION_LOCK}))`
  lockHeld = true

  await client`CREATE SCHEMA IF NOT EXISTS drizzle`
  await client`
    CREATE TABLE IF NOT EXISTS drizzle.catalog_migrations (
      tag text PRIMARY KEY,
      checksum text NOT NULL,
      created_at bigint NOT NULL
    )
  `

  const applied = await client<{ checksum: string; tag: string }[]>`
    SELECT tag, checksum FROM drizzle.catalog_migrations ORDER BY tag
  `
  const appliedChecksums = new Map(applied.map((row) => [row.tag, row.checksum]))
  let foundGap = false

  for (const migration of migrations) {
    const checksum = appliedChecksums.get(migration.tag)

    if (checksum === undefined) {
      foundGap = true
      continue
    }

    if (migration.checksum !== checksum) throw new Error(`Applied catalog migration was modified: ${migration.file}`)

    if (foundGap) throw new Error(`Catalog migration history is not a contiguous prefix at ${migration.tag}`)
  }

  for (const tag of appliedChecksums.keys()) {
    if (!migrationByTag.has(tag)) throw new Error(`Catalog database contains an unknown migration: ${tag}`)
  }

  for (const migration of migrations) {
    if (appliedChecksums.has(migration.tag)) {
      console.log(`skip  ${migration.file}`)
      continue
    }

    console.log(`apply ${migration.file}`)
    const statements = migration.sql
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean)

    await client.begin(async (transaction) => {
      for (const statement of statements) {
        await transaction.unsafe(statement)
      }

      await transaction`
        INSERT INTO drizzle.catalog_migrations (tag, checksum, created_at)
        VALUES (${migration.tag}, ${migration.checksum}, ${Date.now()})
      `
    })
    console.log(`done  ${migration.file}`)
  }

  console.log('Catalog migrations applied.')
} finally {
  try {
    if (lockHeld) await client`SELECT pg_advisory_unlock(hashtext(${MIGRATION_LOCK}))`
  } finally {
    await client.end()
  }
}
