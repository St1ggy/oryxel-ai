// Custom migration runner.
// - Creates __drizzle_migrations table if absent.
// - Skips migrations already recorded there.
// - Applies the rest in order, respecting --> statement-breakpoint.
//
// Usage:
//    bun --env-file=../../.env.development src/migrate.ts
//    bun --env-file=../../.env.production  src/migrate.ts
import { readFileSync, readdirSync } from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

const __dirname = nodePath.dirname(fileURLToPath(import.meta.url))
const migrationsDirectory = nodePath.join(__dirname, '../drizzle')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
  const client = await pool.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      )
    `)

    const { rows: applied } = await client.query<{ hash: string }>('SELECT hash FROM "__drizzle_migrations"')
    const appliedSet = new Set(applied.map((r) => r.hash))

    // If the baseline migration (0000) is not recorded but tables already exist
    // (deployed via db:push), mark it as applied so we don't re-run CREATE TABLE.
    if (!appliedSet.has('0000_dapper_scarlet_witch')) {
      const { rows } = await client.query<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'user_fragrance'
        ) AS exists
      `)

      if (rows[0]?.exists) {
        await client.query('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)', [
          '0000_dapper_scarlet_witch',
          Date.now(),
        ])
        appliedSet.add('0000_dapper_scarlet_witch')
        console.log('mark  0000_dapper_scarlet_witch.sql (tables already exist via db:push)')
      }
    }

    const files = readdirSync(migrationsDirectory)
      .filter((f) => f.endsWith('.sql'))
      .toSorted((a, b) => a.localeCompare(b))

    for (const file of files) {
      const tag = file.replace('.sql', '')

      if (appliedSet.has(tag)) {
        console.log(`skip  ${file}`)
        continue
      }

      console.log(`apply ${file}`)
      const sql = readFileSync(join(migrationsDirectory, file), 'utf8')
      const statements = sql
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean)

      await client.query('BEGIN')

      try {
        for (const stmt of statements) {
          await client.query(stmt)
        }

        await client.query('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)', [tag, Date.now()])

        await client.query('COMMIT')
        console.log(`done  ${file}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }

    console.log('All migrations applied.')
  } finally {
    client.release()
    await pool.end()
  }
}

await run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
