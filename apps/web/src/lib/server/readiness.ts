import type Redis from 'ioredis'

export function createRedisReadinessCheck(redis: Pick<Redis, 'ping'> | null, isDevelopment: boolean) {
  return {
    name: 'redis',
    required: !isDevelopment,
    check: async () => {
      if (!redis) throw new Error('REDIS_URL is not configured')

      await redis.ping()
    },
  }
}
