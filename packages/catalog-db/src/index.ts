import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

const connectionState: {
  databaseUrl?: string
  client?: ReturnType<typeof postgres>
  database?: PostgresJsDatabase<typeof schema>
} = {}

export function resolveCatalogDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    throw new Error('CATALOG_DATABASE_URL is not set')
  }

  const parsed = new URL(rawUrl)

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('CATALOG_DATABASE_URL must use postgres protocol')
  }

  return rawUrl
}

export function isLocalCatalogDatabase(rawUrl: string) {
  const hostname = new URL(rawUrl).hostname

  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.railway.internal')
}

// Web entry points can configure the catalog connection without importing
// private environment modules here.
export function configureCatalogDatabase(databaseUrl: string | undefined) {
  if (databaseUrl) {
    connectionState.databaseUrl = databaseUrl
  }
}

function readDatabaseUrl() {
  return resolveCatalogDatabaseUrl(connectionState.databaseUrl ?? process.env['CATALOG_DATABASE_URL'])
}

function getClient() {
  if (!connectionState.client) {
    const databaseUrl = readDatabaseUrl()

    connectionState.client = postgres(databaseUrl, {
      max: 10,
      prepare: false,
      ssl: isLocalCatalogDatabase(databaseUrl) ? false : 'verify-full',
    })
  }

  return connectionState.client
}

function getDatabaseInstance() {
  connectionState.database ??= drizzle(getClient(), { schema })

  return connectionState.database
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, property, receiver) {
    const instance = getDatabaseInstance()
    const value = Reflect.get(instance, property, receiver)

    return typeof value === 'function' ? value.bind(instance) : value
  },
})

export * from './schema'
