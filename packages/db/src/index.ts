import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'

import * as schema from './schema'

import type { NeonDatabase } from 'drizzle-orm/neon-serverless'

neonConfig.webSocketConstructor = ws

let configuredDatabaseUrl: string | undefined
let pool: Pool | undefined
let dbInstance: NeonDatabase<typeof schema> | undefined

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

function getPool() {
  pool ??= new Pool({ connectionString: readDatabaseUrl() })

  return pool
}

function getDbInstance() {
  dbInstance ??= drizzle(getPool(), { schema })

  return dbInstance
}

export const db = new Proxy({} as NeonDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = getDbInstance()
    const value = Reflect.get(instance, prop, receiver)

    return typeof value === 'function' ? value.bind(instance) : value
  },
})

export * from './schema'
