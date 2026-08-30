import { parseHealthCheckTimeout, runReadinessChecks } from '@oryxel/runtime'
import { json } from '@sveltejs/kit'

import { checkDatabaseConnection } from '$lib/server/db'
import { getRedisClient } from '$lib/server/redis'

import type { RequestHandler } from './$types'

import { env } from '$env/dynamic/private'

export const GET: RequestHandler = async () => {
  const redis = getRedisClient()
  const result = await runReadinessChecks(
    [
      { name: 'database', check: checkDatabaseConnection },
      ...(redis ? [{ name: 'redis', required: false, check: () => redis.ping() }] : []),
    ],
    parseHealthCheckTimeout(env.HEALTHCHECK_TIMEOUT_MS),
  )

  return json(
    {
      status: result.ready ? 'ready' : 'unavailable',
      service: 'web',
      checks: result.checks,
    },
    {
      status: result.ready ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  )
}
