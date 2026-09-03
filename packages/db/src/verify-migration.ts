// Verify parity between source and destination PostgreSQL databases before retiring the source.
//
// Checks:
//   1. Source and destination are different PostgreSQL databases.
//   2. Migration ledgers and sequence state match.
//   3. Schemas and content fingerprints match for every public table.
//   4. Worker activity on the destination in the last hour (background_job).
//   5. Production readiness is exact and required.
//
// Usage:
//   SOURCE_DATABASE_URL=... DESTINATION_DATABASE_URL=... PROD_URL=https://oryxel.ai \
//     bun run --cwd packages/db db:verify-migration
//
// Or with an env file (put SOURCE_DATABASE_URL, DESTINATION_DATABASE_URL, PROD_URL there):
//   bun --env-file=../../.env.verify src/verify-migration.ts
//
// Exit codes: 0 = pass, 1 = failures, 2 = missing env.
import postgres from 'postgres'

import {
  areDatabaseTargetsDistinct,
  compareMigrationLedgers,
  compareSequenceStates,
  compareTableSets,
  isExactProductionReadiness,
} from './cutover-verification'

import type { DatabaseIdentity, MigrationLedgerRow, SequenceState } from './cutover-verification'

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL
const DESTINATION_DATABASE_URL = process.env.DESTINATION_DATABASE_URL
const PROD_URL = process.env.PROD_URL
const WORKER_WINDOW_HOURS = Number(process.env.WORKER_WINDOW_HOURS ?? '1')
const DESTINATION_EXTRA_TABLE_ALLOWLIST = new Set(
  (process.env.DESTINATION_EXTRA_TABLE_ALLOWLIST ?? '')
    .split(',')
    .map((table) => table.trim())
    .filter(Boolean),
)

if (!SOURCE_DATABASE_URL || !DESTINATION_DATABASE_URL || !PROD_URL) {
  console.error('Missing required env: SOURCE_DATABASE_URL, DESTINATION_DATABASE_URL, and PROD_URL')
  console.error('Usage: SOURCE_DATABASE_URL=... DESTINATION_DATABASE_URL=... PROD_URL=... bun src/verify-migration.ts')
  process.exit(2)
}

const verifiedSourceDatabaseUrl: string = SOURCE_DATABASE_URL
const verifiedDestinationDatabaseUrl: string = DESTINATION_DATABASE_URL

if (SOURCE_DATABASE_URL === DESTINATION_DATABASE_URL) {
  console.error('SOURCE_DATABASE_URL and DESTINATION_DATABASE_URL must point to different databases')
  process.exit(2)
}

for (const [name, url] of [
  ['SOURCE_DATABASE_URL', SOURCE_DATABASE_URL],
  ['DESTINATION_DATABASE_URL', DESTINATION_DATABASE_URL],
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
//   - `session`   — new logins after cutover add rows in the destination
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

const source = postgres(SOURCE_DATABASE_URL, clientOptions)
const destination = postgres(DESTINATION_DATABASE_URL, clientOptions)

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

async function getDatabaseIdentity(sql: postgres.Sql) {
  const [identity] = await sql<DatabaseIdentity[]>`
    SELECT
      current_database() AS "databaseName",
      (SELECT oid::text FROM pg_database WHERE datname = current_database()) AS "databaseOid",
      system_identifier::text AS "systemIdentifier"
    FROM pg_control_system()
  `

  if (!identity) throw new Error('PostgreSQL database identity is unavailable')

  return identity
}

async function checkDatabaseIdentity() {
  heading('1. Database identity')

  const [sourceIdentity, destinationIdentity] = await Promise.all([
    getDatabaseIdentity(source),
    getDatabaseIdentity(destination),
  ])

  if (
    !areDatabaseTargetsDistinct(
      verifiedSourceDatabaseUrl,
      verifiedDestinationDatabaseUrl,
      sourceIdentity,
      destinationIdentity,
    )
  ) {
    fail('Source and destination resolve to the same PostgreSQL database')

    return
  }

  pass(`Distinct database identities (${sourceIdentity.databaseName} -> ${destinationIdentity.databaseName})`)
}

async function getMigrationLedger(sql: postgres.Sql) {
  return sql<MigrationLedgerRow[]>`
    SELECT hash, checksum
    FROM "__drizzle_migrations"
    ORDER BY id
  `
}

async function checkMigrationLedgers() {
  heading('2. Migration ledger parity')

  const [sourceLedger, destinationLedger] = await Promise.all([
    getMigrationLedger(source),
    getMigrationLedger(destination),
  ])
  const { missingInDestination, missingInSource, checksumMismatches } = compareMigrationLedgers(
    sourceLedger,
    destinationLedger,
  )

  if (missingInDestination.length > 0) {
    fail(`Migrations missing in destination: ${missingInDestination.join(', ')}`)
  }

  if (missingInSource.length > 0) {
    fail(`Migrations missing in source: ${missingInSource.join(', ')}`)
  }

  if (checksumMismatches.length > 0) {
    fail(`Migration checksum mismatch: ${checksumMismatches.join(', ')}`)
  }

  if (missingInDestination.length === 0 && missingInSource.length === 0 && checksumMismatches.length === 0) {
    pass(`All ${sourceLedger.length} migration tags and checksums match`)
  }
}

async function getSequenceState(sql: postgres.Sql) {
  const sequences = await sql<Omit<SequenceState, 'isCalled' | 'lastValue'>[]>`
    SELECT
      sequence.relname AS "sequenceName",
      owner_table.relname AS "ownerTable",
      owner_column.attname AS "ownerColumn"
    FROM pg_class AS sequence
    INNER JOIN pg_namespace AS sequence_namespace ON sequence_namespace.oid = sequence.relnamespace
    LEFT JOIN pg_depend AS dependency
      ON dependency.classid = 'pg_class'::regclass
      AND dependency.objid = sequence.oid
      AND dependency.refclassid = 'pg_class'::regclass
      AND dependency.deptype IN ('a', 'i')
    LEFT JOIN pg_class AS owner_table ON owner_table.oid = dependency.refobjid
    LEFT JOIN pg_attribute AS owner_column
      ON owner_column.attrelid = dependency.refobjid
      AND owner_column.attnum = dependency.refobjsubid
    WHERE sequence.relkind = 'S' AND sequence_namespace.nspname = 'public'
    ORDER BY sequence.relname
  `

  return Promise.all(
    sequences.map(async (sequence) => {
      const [state] = await sql<{ isCalled: boolean; lastValue: string }[]>`
        SELECT last_value::text AS "lastValue", is_called AS "isCalled"
        FROM ${sql(sequence.sequenceName)}
      `

      if (!state) throw new Error(`Sequence state is unavailable: ${sequence.sequenceName}`)

      return { ...sequence, ...state }
    }),
  )
}

async function checkSequences() {
  heading('3. Sequence ownership and value parity')

  const [sourceSequences, destinationSequences] = await Promise.all([
    getSequenceState(source),
    getSequenceState(destination),
  ])
  const { missingInDestination, missingInSource, mismatches } = compareSequenceStates(
    sourceSequences,
    destinationSequences,
  )

  if (missingInDestination.length > 0 || missingInSource.length > 0 || mismatches.length > 0) {
    fail(
      `Sequence state differs: missing destination=${missingInDestination.length}, missing source=${missingInSource.length}, mismatched=${mismatches.length}`,
    )

    return
  }

  pass(`All ${sourceSequences.length} sequence ownership and value records match`)
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

type Mismatch = { table: string; source: number; destination: number }

function reportTableRow(table: string, sourceFingerprint: TableFingerprint, destinationFingerprint: TableFingerprint) {
  const label = table.padEnd(32)
  const sourceString = String(sourceFingerprint.n).padStart(7)
  const destinationString = String(destinationFingerprint.n).padStart(7)

  if (
    sourceFingerprint.n === destinationFingerprint.n &&
    sourceFingerprint.checksum === destinationFingerprint.checksum
  ) {
    info(`  ${label} source=${sourceString} destination=${destinationString}`)

    return { changed: false, isVolatile: false }
  }

  const diff = destinationFingerprint.n - sourceFingerprint.n
  const sign = diff > 0 ? '+' : ''
  const isVolatile = VOLATILE_TABLES.has(table)
  const bucketColor = isVolatile ? color.yellow : color.red
  const suffix = isVolatile ? ' (volatile — expected drift)' : ''
  const difference = diff === 0 ? ' content differs' : ` diff=${sign}${diff}`

  console.log(
    `  ${bucketColor}${label} source=${sourceString} destination=${destinationString}${difference}${suffix}${color.reset}`,
  )

  return { changed: true, isVolatile }
}

async function checkSchemas(shared: string[]) {
  let mismatches = 0

  for (const table of shared) {
    const [sourceSchema, destinationSchema] = await Promise.all([
      describeTable(source, table),
      describeTable(destination, table),
    ])

    if (sourceSchema !== destinationSchema) {
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
    const [sourceFingerprint, destinationFingerprint] = await Promise.all([
      fingerprintTable(source, table),
      fingerprintTable(destination, table),
    ])
    const { changed, isVolatile } = reportTableRow(table, sourceFingerprint, destinationFingerprint)

    if (!changed) continue

    const bucket = isVolatile ? volatileMismatches : hardMismatches

    bucket.push({ table, source: sourceFingerprint.n, destination: destinationFingerprint.n })
  }

  return { hardMismatches, volatileMismatches }
}

async function checkParity() {
  heading('4. Schema and content parity (source <> destination)')

  const [sourceTables, destinationTables] = await Promise.all([
    safeListTables('source', source),
    safeListTables('destination', destination),
  ])

  if (sourceTables.length === 0 && destinationTables.length === 0) {
    fail('Both DBs returned zero tables — check connection URLs above')

    return
  }

  const destinationTableSet = new Set(destinationTables)
  const { missingInDestination, unexpectedInDestination, allowlistedInDestination } = compareTableSets(
    sourceTables,
    destinationTables,
    DESTINATION_EXTRA_TABLE_ALLOWLIST,
  )

  if (missingInDestination.length > 0) {
    fail(`Tables present in source but missing in destination: ${missingInDestination.join(', ')}`)
  }

  if (unexpectedInDestination.length > 0) {
    fail(`Unexpected tables present only in destination: ${unexpectedInDestination.join(', ')}`)
  }

  if (allowlistedInDestination.length > 0) {
    warn(`Allowlisted tables present only in destination: ${allowlistedInDestination.join(', ')}`)
  }

  const shared = sourceTables.filter((table) => destinationTableSet.has(table))
  const schemaMismatches = await checkSchemas(shared)
  const { hardMismatches, volatileMismatches } = await collectMismatches(shared)

  if (
    schemaMismatches === 0 &&
    hardMismatches.length === 0 &&
    missingInDestination.length === 0 &&
    unexpectedInDestination.length === 0
  ) {
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
  heading(`5. Worker activity on destination (last ${WORKER_WINDOW_HOURS} hour(s))`)

  // background_job columns: created_at, completed_at (no updated_at).
  // status: 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'
  const [row] = await destination<
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
    warn(`${row.failed} job(s) failed in window — inspect worker logs`)
  }
}

async function checkProductionReadiness() {
  const readinessUrl = new URL('/readyz', PROD_URL).href

  try {
    const response = await fetch(readinessUrl, {
      headers: { accept: 'application/json' },
      redirect: 'manual',
    })
    const payload = (await response.json().catch(() => null)) as {
      checks?: Record<string, { status?: string }>
      status?: string
    } | null
    const ready = isExactProductionReadiness(response.status, payload)

    if (ready) pass('GET /readyz -> exact ready status with database and Redis checks')
    else fail('GET /readyz did not return HTTP 200 with status=ready and database/Redis checks=ok')
  } catch (error) {
    fail(`GET /readyz -> network error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function checkReachabilityEndpoint(path: string) {
  const url = new URL(path, PROD_URL).href

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      redirect: 'manual',
    })
    const status = response.status

    if (status >= 500) {
      fail(`GET ${path} -> ${status} (server error — DB reachable from the web runtime?)`)
    } else if (status === 404) {
      warn(`GET ${path} -> 404 (endpoint may not exist in this version)`)
    } else {
      pass(`GET ${path} -> ${status}`)
    }
  } catch (error) {
    fail(`GET ${path} -> network error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function checkProd() {
  heading('6. Production readiness')

  await checkProductionReadiness()

  // GET /api/auth/get-session exercises Better Auth + DB read.
  // Anonymous request returns 200 + `null` body. 5xx = DB unreachable.
  const endpoints = ['/api/auth/get-session', '/']

  for (const path of endpoints) {
    await checkReachabilityEndpoint(path)
  }
}

try {
  await checkDatabaseIdentity()
  await checkMigrationLedgers()
  await checkSequences()
  await checkParity()
  await checkWorkerActivity()
  await checkProd()
} catch (error) {
  fail(`Unhandled error: ${describeError(error)}`)
  console.error(error)
} finally {
  await Promise.allSettled([source.end({ timeout: 5 }), destination.end({ timeout: 5 })])
}

console.log()

if (failures > 0) {
  console.log(`${color.red}${color.bold}RESULT: FAIL${color.reset} — ${failures} failure(s), ${warnings} warning(s)`)
  console.log(`${color.yellow}Do NOT retire the source database yet.${color.reset}`)
  process.exit(1)
}

if (warnings > 0) {
  console.log(`${color.yellow}${color.bold}RESULT: PASS WITH WARNINGS${color.reset} — ${warnings} warning(s)`)
  console.log('Inspect warnings, then decide.')
} else {
  console.log(`${color.green}${color.bold}RESULT: PASS${color.reset} — all checks green`)
  console.log('Keep the source read-only through the 24-48h safety window and confirm backups before deletion.')
}

process.exit(0)
