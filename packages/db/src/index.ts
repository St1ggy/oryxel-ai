import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

let configuredDatabaseUrl: string | undefined
let client: ReturnType<typeof postgres> | undefined
let dbInstance: PostgresJsDatabase<typeof schema> | undefined

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

/** Web (SvelteKit) should call this early with `$env/dynamic/private`. Worker/scripts use `process.env`. */
export function configureDatabase(databaseUrl: string | undefined) {
  if (databaseUrl) {
    configuredDatabaseUrl = databaseUrl
  }
}

function readDatabaseUrl() {
  return resolveDatabaseUrl(configuredDatabaseUrl ?? process.env['DATABASE_URL'])
}

function isInternalHost(url: string) {
  try {
    return new URL(url).hostname.endsWith('.railway.internal')
  } catch {
    return false
  }
}

function getClient() {
  if (!client) {
    const url = readDatabaseUrl()

    client = postgres(url, {
      max: 10,
      prepare: false,
      ssl: isInternalHost(url) ? false : 'require',
    })
  }

  return client
}

function getDbInstance() {
  dbInstance ??= drizzle(getClient(), { schema })

  return dbInstance
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = getDbInstance()
    const value = Reflect.get(instance, prop, receiver)

    return typeof value === 'function' ? value.bind(instance) : value
  },
})

export * from './schema'
