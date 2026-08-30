import Redis from 'ioredis'

import { building } from '$app/environment'
import { env } from '$env/dynamic/private'

let redisClient: Redis | null | undefined

export function getRedisClient() {
  if (redisClient !== undefined) return redisClient

  if (building || !env.REDIS_URL) {
    redisClient = null

    return redisClient
  }

  redisClient = new Redis(env.REDIS_URL, {
    commandTimeout: 1500,
    connectTimeout: 1500,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    protocol: 2,
  })
  redisClient.on('error', (error) => {
    console.error('[web] redis error:', error instanceof Error ? error.message : error)
  })

  return redisClient
}
