import { afterEach, describe, expect, it, vi } from 'vitest'

import { startReconciliation } from './reconciliation'
import { resolveGatewayRuntimeConfig } from './runtime-config'
import { StreamLimiter } from './stream-limiter'

afterEach(() => {
  vi.useRealTimers()
})

describe('resolveGatewayRuntimeConfig', () => {
  it('requires an exact CORS origin in production', () => {
    expect(() => resolveGatewayRuntimeConfig({ NODE_ENV: 'production' })).toThrow(
      'STREAM_CORS_ORIGIN must be an exact origin in production',
    )
    expect(() => resolveGatewayRuntimeConfig({ NODE_ENV: 'production', STREAM_CORS_ORIGIN: '*' })).toThrow(
      'STREAM_CORS_ORIGIN must be an exact origin in production',
    )
  })

  it('accepts bounded production stream settings', () => {
    expect(
      resolveGatewayRuntimeConfig({
        RAILWAY_DEPLOYMENT_ID: 'deployment-id',
        STREAM_CORS_ORIGIN: 'https://app.example.com',
        MAX_ACTIVE_STREAMS: '12',
        MAX_ACTIVE_STREAMS_PER_USER: '3',
        STREAM_RECONCILE_INTERVAL_MS: '2000',
      }),
    ).toEqual({
      corsOrigin: 'https://app.example.com',
      maxActiveStreams: 12,
      maxActiveStreamsPerUser: 3,
      reconcileIntervalMs: 2000,
    })
  })
})

describe('startReconciliation', () => {
  it('runs periodically and stops during stream cleanup', () => {
    vi.useFakeTimers()
    const reconcile = vi.fn()
    const stop = startReconciliation(reconcile, 1000)

    vi.advanceTimersByTime(2500)
    expect(reconcile).toHaveBeenCalledTimes(2)

    stop()
    vi.advanceTimersByTime(2000)
    expect(reconcile).toHaveBeenCalledTimes(2)
  })
})

describe('StreamLimiter', () => {
  it('rejects streams at per-user and global caps and restores counters on cleanup', () => {
    const limiter = new StreamLimiter(2, 1)
    const releaseFirst = limiter.tryAcquire('user-1')

    expect(releaseFirst).toBeTypeOf('function')
    expect(limiter.tryAcquire('user-1')).toBeNull()

    const releaseSecond = limiter.tryAcquire('user-2')

    expect(releaseSecond).toBeTypeOf('function')
    expect(limiter.tryAcquire('user-3')).toBeNull()
    expect(limiter.activeTotal).toBe(2)

    releaseFirst?.()
    releaseFirst?.()
    expect(limiter.activeTotal).toBe(1)
    expect(limiter.tryAcquire('user-1')).toBeTypeOf('function')
  })
})
