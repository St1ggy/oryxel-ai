// Verify parity between Neon (old) and Railway (new) Postgres before deleting Neon.
//
// Checks:
//   1. Schemas and content fingerprints match for every public table.
//   2. Worker activity on Railway in the last hour (background_job).
//   3. Prod endpoint reachability (if PROD_URL is set).
//
// Usage:
//   NEON_URL=... RAILWAY_URL=... PROD_URL=https://oryxel.ai \
//     bun run --cwd packages/db db:verify-migration
//
// Or with an env file (put NEON_URL, RAILWAY_URL, PROD_URL there):
//   bun --env-file=../../.env.verify src/verify-migration.ts
//
// Exit codes: 0 = pass, 1 = failures, 2 = missing env.
import postgres from 'postgres'

const NEON_URL = process.env.NEON_URL
const RAILWAY_URL = process.env.RAILWAY_URL
const PROD_URL = process.env.PROD_URL // optional
const WORKER_WINDOW_HOURS = Number(process.env.WORKER_WINDOW_HOURS ?? '1')

if (!NEON_URL || !RAILWAY_URL) {
  console.error('Missing required env: NEON_URL and RAILWAY_URL')
  console.error('Usage: NEON_URL=... RAILWAY_URL=... [PROD_URL=...] bun src/verify-migration.ts')
  process.exit(2)
}

for (const [name, url] of [
  ['NEON_URL', NEON_URL],
  ['RAILWAY_URL', RAILWAY_URL],
] as const) {
  if (!url.includes('.railway.internal')) {
    continue
  }

  console.error(
    `${name} points to a Railway internal host (.railway.internal) — that only resolves from inside Railway.`,
  )
  console.error('Use DATABASE_PUBLIC_URL from Railway Variables (host ends in .proxy.rlwy.net) when running locally.')
  process.exit(2)
}

const EXCLUDE_TABLES = new Set(['__drizzle_migrations'])
// Tables that legitimately drift after cutover (Better Auth writes to them during normal use):
//   - `session`   — new logins after cutover add rows in Railway
//   - `verification` — OAuth state tokens get consumed and deleted after use
const VOLATILE_TABLES = new Set(['session', 'verification'])

const color = {
  reset: '[0m',
  green: '[32m',
  red: '[31m',
  yellow: '[33m',
  dim: '[2m',
  bold: '[1m',
}

let failures = 0
let warnings = 0

const pass = (message: string) => {
  console.log(`${color.green}[PASS]${color.reset} ${message}`)
}
const fail = (message: string) => {
  console.log(`${color.red}[FAIL]${color.reset} ${message}`)
  failures++
}
const warn = (message: string) => {
  console.log(`${color.yellow}[WARN]${color.reset} ${message}`)
  warnings++
}
const info = (message: string) => {
  console.log(`${color.dim}${message}${color.reset}`)
}
const heading = (message: string) => {
  console.log(`\n${color.bold}${message}${color.reset}`)
}

// eslint-disable-next-line camelcase -- postgres.js option names are snake_case
const clientOptions = { ssl: 'verify-full' as const, max: 3, idle_timeout: 5, connect_timeout: 15 } as const

const neon = postgres(NEON_URL, clientOptions)
const railway = postgres(RAILWAY_URL, clientOptions)

function describeError(error: unknown): string {
  if (error === undefined || error === null) return String(error)

  if (error instanceof Error) {
    const parts: string[] = []

    if (error.message) parts.push(error.message)

    for (const key of ['code', 'severity_local', 'hint', 'detail', 'position']) {
      const value = Reflect.get(error, key)

      if (value != null && value !== '') parts.push(`${key}=${String(value)}`)
    }

    if (error.stack) parts.push(`\n${error.stack}`)

    return parts.join(' ') || error.toString()
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

async function safeListTables(name: string, sql: postgres.Sql): Promise<string[]> {
  try {
    const rows = await sql<{ tablename: string }[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `

    return rows.map((r) => r.tablename).filter((t) => !EXCLUDE_TABLES.has(t))
  } catch (error) {
    fail(`Could not list tables in ${name}: ${describeError(error)}`)
    console.error(error)

    return []
  }
}

async function describeTable(sql: postgres.Sql, table: string) {
  const qualifiedTable = `public.${table}`
  const [row] = await sql<{ descriptor: string }[]>`
    SELECT jsonb_build_object(
      'columns', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', column_name,
            'type', data_type,
            'udt', udt_name,
            'nullable', is_nullable,
            'default', column_default,
            'maxLength', character_maximum_length,
            'precision', numeric_precision,
            'scale', numeric_scale
          ) ORDER BY ordinal_position
        )
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table}
      ), '[]'::jsonb),
      'constraints', COALESCE((
        SELECT jsonb_agg(pg_get_constraintdef(oid, true) ORDER BY contype, pg_get_constraintdef(oid, true))
        FROM pg_constraint
        WHERE conrelid = to_regclass(${qualifiedTable})
      ), '[]'::jsonb),
      'indexes', COALESCE((
        SELECT jsonb_agg(indexdef ORDER BY indexdef)
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = ${table}
      ), '[]'::jsonb)
    )::text AS descriptor
  `

  return row?.descriptor ?? ''
}

type TableFingerprint = { checksum: string; n: number }

async function fingerprintTable(sql: postgres.Sql, table: string): Promise<TableFingerprint> {
  const [row] = await sql<TableFingerprint[]>`
    SELECT
      COUNT(*)::int AS n,
      CONCAT(
        COALESCE(SUM((('x' || SUBSTR(row_hash, 1, 16))::bit(64)::bigint)::numeric), 0)::text,
        ':',
        COALESCE(SUM((('x' || SUBSTR(row_hash, 17, 16))::bit(64)::bigint)::numeric), 0)::text
      ) AS checksum
    FROM (
      SELECT MD5(to_jsonb(source_row)::text) AS row_hash
      FROM ${sql(table)} AS source_row
    ) AS row_hashes
  `

  return row ?? { checksum: '0:0', n: 0 }
}

type Mismatch = { table: string; neon: number; railway: number }

function reportTableRow(table: string, neonFingerprint: TableFingerprint, railwayFingerprint: TableFingerprint) {
  const label = table.padEnd(32)
  const neonString = String(neonFingerprint.n).padStart(7)
  const railwayString = String(railwayFingerprint.n).padStart(7)

  if (neonFingerprint.n === railwayFingerprint.n && neonFingerprint.checksum === railwayFingerprint.checksum) {
    info(`  ${label} neon=${neonString} railway=${railwayString}`)

    return { changed: false, isVolatile: false }
  }

  const diff = railwayFingerprint.n - neonFingerprint.n
  const sign = diff > 0 ? '+' : ''
  const isVolatile = VOLATILE_TABLES.has(table)
  const bucketColor = isVolatile ? color.yellow : color.red
  const suffix = isVolatile ? ' (volatile — expected drift)' : ''
  const difference = diff === 0 ? ' content differs' : ` diff=${sign}${diff}`

  console.log(
    `  ${bucketColor}${label} neon=${neonString} railway=${railwayString}${difference}${suffix}${color.reset}`,
  )

  return { changed: true, isVolatile }
}

async function checkSchemas(shared: string[]) {
  let mismatches = 0

  for (const table of shared) {
    const [neonSchema, railwaySchema] = await Promise.all([describeTable(neon, table), describeTable(railway, table)])

    if (neonSchema !== railwaySchema) {
      fail(`Schema mismatch for table ${table}`)
      mismatches++
    }
  }

  return mismatches
}

async function collectMismatches(shared: string[]) {
  const hardMismatches: Mismatch[] = []
  const volatileMismatches: Mismatch[] = []

  for (const table of shared) {
    const [neonFingerprint, railwayFingerprint] = await Promise.all([
      fingerprintTable(neon, table),
      fingerprintTable(railway, table),
    ])
    const { changed, isVolatile } = reportTableRow(table, neonFingerprint, railwayFingerprint)

    if (!changed) continue

    const bucket = isVolatile ? volatileMismatches : hardMismatches

    bucket.push({ table, neon: neonFingerprint.n, railway: railwayFingerprint.n })
  }

  return { hardMismatches, volatileMismatches }
}

async function checkParity() {
  heading('1. Schema and content parity (Neon <> Railway)')

  const [neonTables, railwayTables] = await Promise.all([
    safeListTables('Neon', neon),
    safeListTables('Railway', railway),
  ])

  if (neonTables.length === 0 && railwayTables.length === 0) {
    fail('Both DBs returned zero tables — check connection URLs above')

    return
  }

  const neonTableSet = new Set(neonTables)
  const railwayTableSet = new Set(railwayTables)
  const missingInRailway = neonTables.filter((table) => !railwayTableSet.has(table))
  const extraInRailway = railwayTables.filter((table) => !neonTableSet.has(table))

  if (missingInRailway.length > 0) {
    fail(`Tables present in Neon but missing in Railway: ${missingInRailway.join(', ')}`)
  }

  if (extraInRailway.length > 0) {
    warn(`Extra tables in Railway (ok if a newer migration added them): ${extraInRailway.join(', ')}`)
  }

  const shared = neonTables.filter((table) => railwayTableSet.has(table))
  const schemaMismatches = await checkSchemas(shared)
  const { hardMismatches, volatileMismatches } = await collectMismatches(shared)

  if (schemaMismatches === 0 && hardMismatches.length === 0 && missingInRailway.length === 0) {
    pass(`All ${shared.length - volatileMismatches.length} non-volatile tables match schema and content`)
  }

  if (volatileMismatches.length > 0) {
    warn(
      `${volatileMismatches.length} volatile table(s) drifted (${volatileMismatches
        .map((m) => m.table)
        .join(', ')}) — normal after cutover`,
    )
  }

  if (hardMismatches.length > 0) {
    fail(`${hardMismatches.length} non-volatile table(s) with row-count mismatch`)
  }
}

async function checkWorkerActivity() {
  heading(`2. Worker activity on Railway (last ${WORKER_WINDOW_HOURS} hour(s))`)

  // background_job columns: created_at, completed_at (no updated_at).
  // status: 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'
  const [row] = await railway<
    {
      done: number
      processing: number
      failed: number
      cancelled: number
      pending: number
      last_created: Date | null
      last_completed: Date | null
    }[]
  >`
    SELECT
      COUNT(*) FILTER (WHERE status = 'done')::int        AS done,
      COUNT(*) FILTER (WHERE status = 'processing')::int  AS processing,
      COUNT(*) FILTER (WHERE status = 'failed')::int      AS failed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int   AS cancelled,
      COUNT(*) FILTER (WHERE status = 'pending')::int     AS pending,
      MAX(created_at)                                     AS last_created,
      MAX(completed_at)                                   AS last_completed
    FROM background_job
    WHERE created_at > now() - make_interval(hours => ${WORKER_WINDOW_HOURS})
  `

  if (!row) {
    warn('background_job returned no aggregate row (table empty?)')

    return
  }

  info(
    `  done=${row.done} processing=${row.processing} failed=${row.failed} cancelled=${row.cancelled} pending=${row.pending}`,
  )
  info(`  last created:   ${row.last_created?.toISOString() ?? 'no jobs in window'}`)
  info(`  last completed: ${row.last_completed?.toISOString() ?? 'no completed jobs in window'}`)

  if (row.done > 0) {
    pass(`Worker completed ${row.done} job(s) in the last ${WORKER_WINDOW_HOURS}h`)
  } else if (row.processing > 0 || row.pending > 0) {
    warn(`No completed jobs, but ${row.processing + row.pending} in-flight — worker might be lagging`)
  } else {
    warn(`No worker activity in the last ${WORKER_WINDOW_HOURS}h (idle traffic, or worker down?)`)
  }

  if (row.failed > 0) {
    warn(`${row.failed} job(s) failed in window — inspect Railway logs`)
  }
}

async function checkProd() {
  heading('3. Prod endpoint reachability')

  if (!PROD_URL) {
    info('  PROD_URL not set — skipping (set to https://your-app.example.com to enable)')

    return
  }

  // GET /api/auth/get-session exercises Better Auth + DB read.
  // Anonymous request returns 200 + `null` body. 5xx = DB unreachable.
  const endpoints = ['/api/auth/get-session', '/']

  for (const path of endpoints) {
    const url = new URL(path, PROD_URL).href

    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        redirect: 'manual',
      })
      const status = response.status

      if (status >= 500) {
        fail(`GET ${path} -> ${status} (server error — DB reachable from Vercel?)`)
      } else if (status === 404) {
        warn(`GET ${path} -> 404 (endpoint may not exist in this version)`)
      } else {
        pass(`GET ${path} -> ${status}`)
      }
    } catch (error) {
      fail(`GET ${path} -> network error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

try {
  await checkParity()
  await checkWorkerActivity()
  await checkProd()
} catch (error) {
  fail(`Unhandled error: ${describeError(error)}`)
  console.error(error)
} finally {
  await Promise.allSettled([neon.end({ timeout: 5 }), railway.end({ timeout: 5 })])
}

console.log()

if (failures > 0) {
  console.log(`${color.red}${color.bold}RESULT: FAIL${color.reset} — ${failures} failure(s), ${warnings} warning(s)`)
  console.log(`${color.yellow}Do NOT delete Neon yet.${color.reset}`)
  process.exit(1)
}

if (warnings > 0) {
  console.log(`${color.yellow}${color.bold}RESULT: PASS WITH WARNINGS${color.reset} — ${warnings} warning(s)`)
  console.log('Inspect warnings, then decide.')
} else {
  console.log(`${color.green}${color.bold}RESULT: PASS${color.reset} — all checks green`)
  console.log('Keep Neon read-only through the 24-48h safety window and confirm backups before deletion.')
}

process.exit(0)
