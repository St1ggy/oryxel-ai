import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'

import * as schema from './schema'

neonConfig.webSocketConstructor = ws

function resolveDatabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  const parsed = new URL(rawUrl)

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use postgres protocol')
  }

  return rawUrl
}

const pool = new Pool({ connectionString: resolveDatabaseUrl(process.env.DATABASE_URL) })

export const db = drizzle(pool, { schema })

export * from './schema'
