import { isProductionRuntime } from '@oryxel/runtime'

export function validateWorkerRedisUrl(
  redisUrl: string | undefined,
  environment: Record<string, string | undefined> = process.env,
) {
  if (!redisUrl && isProductionRuntime(environment)) throw new Error('REDIS_URL is required in production')

  return redisUrl
}
