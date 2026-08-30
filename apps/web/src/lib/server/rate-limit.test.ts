import { describe, expect, it, vi } from 'vitest'

import { consumeRateLimit, createRateLimitKey, createRedisSecondaryStorage, resolveRateLimitPolicy } from './rate-limit'

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

describe('createRedisSecondaryStorage', () => {
  it('uses the shared atomic counter and namespaces Better Auth keys', async () => {
    const evalMock = vi.fn().mockResolvedValue([2, 60])
    const redis = mockRedis({ eval: evalMock })
    const storage = createRedisSecondaryStorage(redis)

    await expect(storage?.increment('rate-limit:ip', 30)).resolves.toBe(2)
    expect(evalMock).toHaveBeenCalledWith(expect.any(String), 1, 'oryxel:auth:rate-limit:ip', 30)
  })

  it('supports expiring values and deletion', async () => {
    const setMock = vi.fn()
    const delMock = vi.fn()
    const redis = mockRedis({ del: delMock, set: setMock })
    const storage = createRedisSecondaryStorage(redis)

    await storage?.set('session', 'value', 12.2)
    await storage?.delete('session')

    expect(setMock).toHaveBeenCalledWith('oryxel:auth:session', 'value', 'EX', 13)
    expect(delMock).toHaveBeenCalledWith('oryxel:auth:session')
  })

  it('lets database-backed sessions fall back when Redis reads fail', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => false)
    const redis = mockRedis({ get: vi.fn().mockRejectedValue(new Error('unavailable')) })
    const storage = createRedisSecondaryStorage(redis)

    await expect(storage?.get('session')).resolves.toBeNull()
    expect(errorSpy).toHaveBeenCalledWith('[web] auth cache read failed:', 'unavailable')

    errorSpy.mockRestore()
  })

  it('is disabled when Redis is not configured', () => {
    expect(createRedisSecondaryStorage(null)).toBeUndefined()
  })
})
