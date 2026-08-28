import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

let configuredDatabaseUrl: string | undefined
let client: ReturnType<typeof postgres> | undefined
let databaseInstance: PostgresJsDatabase<typeof schema> | undefined

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

function getClient() {
  if (!client) {
    const url = readDatabaseUrl()

    client = postgres(url, {
      max: 10,
      prepare: false,
      ssl: isPrivateDatabaseHost(url) ? false : 'verify-full',
    })
  }

  return client
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

  client = undefined
  databaseInstance = undefined

  await activeClient?.end({ timeout: 5 })
}

export * from './schema'
