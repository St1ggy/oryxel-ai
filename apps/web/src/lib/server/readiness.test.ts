import { describe, expect, it, vi } from 'vitest'

import { createRedisReadinessCheck } from './readiness'

describe('createRedisReadinessCheck', () => {
  it('requires Redis outside local development', async () => {
    const check = createRedisReadinessCheck(null, false)

    expect(check.required).toBe(true)
    await expect(check.check()).rejects.toThrow('REDIS_URL is not configured')
  })

  it('keeps missing Redis optional during local development', () => {
    expect(createRedisReadinessCheck(null, true).required).toBe(false)
  })

  it('pings a configured Redis client', async () => {
    const ping = vi.fn().mockResolvedValue('PONG')
    const check = createRedisReadinessCheck({ ping }, false)

    await expect(check.check()).resolves.toBeUndefined()
    expect(ping).toHaveBeenCalledOnce()
  })
})
