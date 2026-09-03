import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { assertMigrationHistoryReady } from './migration-readiness'
import * as schema from './schema'

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

let configuredDatabaseUrl: string | undefined
let client: ReturnType<typeof postgres> | undefined
let advisoryLockClient: ReturnType<typeof postgres> | undefined
let databaseInstance: PostgresJsDatabase<typeof schema> | undefined
const USER_DATA_LOCK_NAMESPACE = 'oryxel:user-data'
const USER_DATA_LOCK_RETRY_MS = 100

export function resolveDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  const parsed = new URL(rawUrl)

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use postgres protocol')
  }

  return rawUrl
}

//
// Web (SvelteKit) should call this early with `$env/dynamic/private`. Worker/scripts use `process.env`.
//
export function configureDatabase(databaseUrl: string | undefined) {
  if (databaseUrl) {
    configuredDatabaseUrl = databaseUrl
  }
}

function readDatabaseUrl() {
  return resolveDatabaseUrl(configuredDatabaseUrl ?? process.env['DATABASE_URL'])
}

function isPrivateDatabaseHost(url: string) {
  try {
    const hostname = new URL(url).hostname

    return hostname.endsWith('.railway.internal') || ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
  } catch {
    return false
  }
}

function createClient(max: number) {
  const url = readDatabaseUrl()

  return postgres(url, {
    max,
    prepare: false,
    ssl: isPrivateDatabaseHost(url) ? false : 'verify-full',
  })
}

function getClient() {
  client ??= createClient(10)

  return client
}

function getAdvisoryLockClient() {
  advisoryLockClient ??= createClient(4)

  return advisoryLockClient
}

function getDatabaseInstance() {
  databaseInstance ??= drizzle(getClient(), { schema })

  return databaseInstance
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, property, receiver) {
    const instance = getDatabaseInstance()
    const value = Reflect.get(instance, property, receiver)

    return typeof value === 'function' ? value.bind(instance) : value
  },
})

export async function closeDatabase() {
  const activeClient = client
  const activeAdvisoryLockClient = advisoryLockClient

  client = undefined
  advisoryLockClient = undefined
  databaseInstance = undefined

  await Promise.all([activeClient?.end({ timeout: 5 }), activeAdvisoryLockClient?.end({ timeout: 5 })])
}

export async function checkDatabaseReadiness() {
  try {
    const appliedMigrations = await getClient()<{ checksum: string | null; hash: string }[]>`
      SELECT hash, checksum
      FROM "__drizzle_migrations"
      ORDER BY id
    `

    assertMigrationHistoryReady(appliedMigrations)
  } catch {
    throw new Error('Database is not ready')
  }
}

export async function withUserDataLock<T>(userId: string, callback: () => Promise<T>): Promise<T> {
  let reservedClient: Awaited<ReturnType<ReturnType<typeof postgres>['reserve']>>

  while (true) {
    reservedClient = await getAdvisoryLockClient().reserve()

    try {
      const [result] = await reservedClient<{ acquired: boolean }[]>`
        SELECT pg_try_advisory_lock(
          hashtext(${USER_DATA_LOCK_NAMESPACE}),
          hashtext(${userId})
        ) AS acquired
      `

      if (result?.acquired) break
    } catch (error) {
      reservedClient.release()
      throw error
    }

    reservedClient.release()
    await new Promise((resolve) => setTimeout(resolve, USER_DATA_LOCK_RETRY_MS))
  }

  try {
    return await callback()
  } finally {
    try {
      await reservedClient`SELECT pg_advisory_unlock(hashtext(${USER_DATA_LOCK_NAMESPACE}), hashtext(${userId}))`
    } finally {
      reservedClient.release()
    }
  }
}

export * from './schema'
