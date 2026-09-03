import { describe, expect, it } from 'vitest'

import { validateWorkerRedisUrl } from './runtime-config'

describe('validateWorkerRedisUrl', () => {
  it('rejects missing Redis in a production Node runtime', () => {
    expect(() => validateWorkerRedisUrl(undefined, { NODE_ENV: 'production' })).toThrow(
      'REDIS_URL is required in production',
    )
  })

  it('rejects missing Redis in a Railway deployment', () => {
    expect(() => validateWorkerRedisUrl(undefined, { RAILWAY_DEPLOYMENT_ID: 'deployment-id' })).toThrow(
      'REDIS_URL is required in production',
    )
  })

  it('allows local development without Redis', () => {
    expect(validateWorkerRedisUrl(undefined, { NODE_ENV: 'development' })).toBeUndefined()
  })
})
