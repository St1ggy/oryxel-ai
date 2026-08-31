import { logError } from '@oryxel/runtime'
import { createHash } from 'node:crypto'

import type Redis from 'ioredis'

export type RateLimitPolicy = {
  scope: 'account' | 'admin' | 'ai' | 'mutation' | 'read'
  windowSeconds: number
  max: number
  failClosed: boolean
}

export type RateLimitDecision = {
  allowed: boolean
  retryAfterSeconds: number
}

const INCREMENT_WITH_TTL_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if current == 1 or ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`

const GET_AND_DELETE_SCRIPT = `
local value = redis.call('GET', KEYS[1])
if value then
  redis.call('DEL', KEYS[1])
end
return value
`

const POLICIES = {
  account: { scope: 'account', windowSeconds: 60 * 60, max: 5, failClosed: true },
  admin: { scope: 'admin', windowSeconds: 60, max: 10, failClosed: true },
  ai: { scope: 'ai', windowSeconds: 60, max: 10, failClosed: true },
  mutation: { scope: 'mutation', windowSeconds: 60, max: 60, failClosed: false },
  read: { scope: 'read', windowSeconds: 60, max: 240, failClosed: false },
} as const satisfies Record<string, RateLimitPolicy>

const AI_PATHS = new Set(['/api/agent/preferences', '/api/agent/preferences/stream', '/api/agent/profile-sync'])

const ACCOUNT_PATHS = new Set(['/api/account/delete', '/api/account/export'])

const getAuthStorageKey = (key: string) => `oryxel:auth:${key}`

export function resolveRateLimitPolicy(pathname: string, method: string): RateLimitPolicy | null {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  if (!path.startsWith('/api/') || path === '/api/auth' || path.startsWith('/api/auth/') || method === 'OPTIONS') {
    return null
  }

  if (AI_PATHS.has(path)) return POLICIES.ai

  if (ACCOUNT_PATHS.has(path)) return POLICIES.account

  if (path === '/api/admin/platform-access') return POLICIES.admin

  if (method === 'GET' || method === 'HEAD') return POLICIES.read

  return POLICIES.mutation
}

export function createRateLimitKey(scope: RateLimitPolicy['scope'], identity: string) {
  const identityHash = createHash('sha256').update(identity).digest('base64url')

  return `oryxel:rate-limit:v1:${scope}:${identityHash}`
}

async function incrementWithTtl(redis: Redis, key: string, ttlSeconds: number) {
  const ttl = Math.max(1, Math.ceil(ttlSeconds))
  const result = await redis.eval(INCREMENT_WITH_TTL_SCRIPT, 1, key, ttl)

  if (!Array.isArray(result) || result.length !== 2) {
    throw new TypeError('Redis returned an invalid rate-limit result')
  }

  const count = Number(result[0])
  const remainingTtl = Number(result[1])

  if (!Number.isFinite(count) || !Number.isFinite(remainingTtl)) {
    throw new TypeError('Redis returned a non-numeric rate-limit result')
  }

  return { count, remainingTtl: Math.max(1, Math.ceil(remainingTtl)) }
}

export async function consumeRateLimit(redis: Redis, key: string, policy: RateLimitPolicy): Promise<RateLimitDecision> {
  const { count, remainingTtl } = await incrementWithTtl(redis, key, policy.windowSeconds)

  return {
    allowed: count <= policy.max,
    retryAfterSeconds: remainingTtl,
  }
}

export function createRedisSecondaryStorage(redis: Redis | null) {
  if (!redis) return

  return {
    get: async (key: string) => {
      try {
        return await redis.get(getAuthStorageKey(key))
      } catch (error) {
        logError('web', 'auth.cache.read_failed', error, { component: 'redis' })

        return null
      }
    },
    getAndDelete: async (key: string) => {
      const value = await redis.eval(GET_AND_DELETE_SCRIPT, 1, getAuthStorageKey(key))

      return typeof value === 'string' ? value : null
    },
    set: async (key: string, value: string, ttl?: number) => {
      await (ttl === undefined
        ? redis.set(getAuthStorageKey(key), value)
        : redis.set(getAuthStorageKey(key), value, 'EX', Math.max(1, Math.ceil(ttl))))
    },
    delete: async (key: string) => {
      await redis.del(getAuthStorageKey(key))
    },
    increment: async (key: string, ttl?: number) => {
      const result = await incrementWithTtl(redis, getAuthStorageKey(key), ttl ?? 60)

      return result.count
    },
  }
}
