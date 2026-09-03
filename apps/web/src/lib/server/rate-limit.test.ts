import { describe, expect, it, vi } from 'vitest'

import {
  consumeRateLimit,
  createRateLimitKey,
  createRedisAuthRateLimitStorage,
  requiresRateLimitStore,
  resolveRateLimitPolicy,
} from './rate-limit'

import type Redis from 'ioredis'

function mockRedis(overrides: Partial<Redis> = {}) {
  return {
    del: vi.fn(),
    eval: vi.fn().mockResolvedValue([1, 60]),
    get: vi.fn(),
    set: vi.fn(),
    ...overrides,
  } as unknown as Redis
}

describe('resolveRateLimitPolicy', () => {
  it('assigns fail-closed policies to costly and sensitive endpoints', () => {
    expect(resolveRateLimitPolicy('/api/agent/preferences/stream', 'POST')).toEqual({
      scope: 'ai',
      windowSeconds: 60,
      max: 10,
      failClosed: true,
    })
    expect(resolveRateLimitPolicy('/api/account/export', 'GET')).toEqual({
      scope: 'account',
      windowSeconds: 3600,
      max: 5,
      failClosed: true,
    })
    expect(resolveRateLimitPolicy('/api/admin/platform-access', 'POST')?.failClosed).toBe(true)
    expect(resolveRateLimitPolicy('/api/agent/profile-sync/', 'POST')?.scope).toBe('ai')
  })

  it('pools ordinary reads and mutations separately', () => {
    expect(resolveRateLimitPolicy('/api/search/fragrances', 'GET')?.scope).toBe('read')
    expect(resolveRateLimitPolicy('/api/lists', 'POST')?.scope).toBe('mutation')
  })

  it('leaves Better Auth and non-API requests to their own handlers', () => {
    expect(resolveRateLimitPolicy('/api/auth/sign-in/social', 'POST')).toBeNull()
    expect(resolveRateLimitPolicy('/api/auth', 'POST')).toBeNull()
    expect(resolveRateLimitPolicy('/api/lists', 'OPTIONS')).toBeNull()
    expect(resolveRateLimitPolicy('/healthz', 'GET')).toBeNull()
  })
})

describe('createRateLimitKey', () => {
  it('creates stable keys without exposing the identity', () => {
    const first = createRateLimitKey('read', 'ip:203.0.113.7')

    expect(first).toBe(createRateLimitKey('read', 'ip:203.0.113.7'))
    expect(first).not.toContain('203.0.113.7')
    expect(first).not.toBe(createRateLimitKey('read', 'user:user-1'))
  })
})

describe('requiresRateLimitStore', () => {
  it('fails closed without Redis only for sensitive policies', () => {
    const sensitive = resolveRateLimitPolicy('/api/account/export', 'GET')
    const ordinary = resolveRateLimitPolicy('/api/search/fragrances', 'GET')

    expect(sensitive && requiresRateLimitStore(sensitive)).toBe(true)
    expect(ordinary && requiresRateLimitStore(ordinary)).toBe(false)
  })
})

describe('consumeRateLimit', () => {
  it('allows requests through the configured maximum', async () => {
    const redis = mockRedis({ eval: vi.fn().mockResolvedValue([10, 41]) })

    await expect(
      consumeRateLimit(redis, 'rate-key', {
        scope: 'ai',
        windowSeconds: 60,
        max: 10,
        failClosed: true,
      }),
    ).resolves.toEqual({ allowed: true, retryAfterSeconds: 41 })
  })

  it('blocks requests above the maximum and reports the remaining window', async () => {
    const redis = mockRedis({ eval: vi.fn().mockResolvedValue([11, 39]) })

    await expect(
      consumeRateLimit(redis, 'rate-key', {
        scope: 'ai',
        windowSeconds: 60,
        max: 10,
        failClosed: true,
      }),
    ).resolves.toEqual({ allowed: false, retryAfterSeconds: 39 })
  })

  it('rejects malformed Redis results', async () => {
    const redis = mockRedis({ eval: vi.fn().mockResolvedValue('invalid') })

    await expect(
      consumeRateLimit(redis, 'rate-key', {
        scope: 'read',
        windowSeconds: 60,
        max: 240,
        failClosed: false,
      }),
    ).rejects.toThrow('invalid rate-limit result')
  })
})

describe('createRedisAuthRateLimitStorage', () => {
  it('atomically allows requests and namespaces Better Auth keys', async () => {
    const evalMock = vi.fn().mockResolvedValue([2, 27])
    const redis = mockRedis({ eval: evalMock })
    const storage = createRedisAuthRateLimitStorage(redis)

    await expect(storage?.consume('rate-limit:ip', { window: 30, max: 2 })).resolves.toEqual({
      allowed: true,
      retryAfter: null,
    })
    expect(evalMock).toHaveBeenCalledWith(expect.any(String), 1, 'oryxel:auth-rate-limit:rate-limit:ip', 30)
  })

  it('reports the remaining Redis window after the limit is exceeded', async () => {
    const redis = mockRedis({ eval: vi.fn().mockResolvedValue([3, 19]) })
    const storage = createRedisAuthRateLimitStorage(redis)

    await expect(storage?.consume('rate-limit:ip', { window: 30, max: 2 })).resolves.toEqual({
      allowed: false,
      retryAfter: 19,
    })
  })

  it('is disabled when Redis is not configured', () => {
    expect(createRedisAuthRateLimitStorage(null)).toBeUndefined()
  })
})
