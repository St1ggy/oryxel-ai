import { parseHealthCheckTimeout, runReadinessChecks } from '@oryxel/runtime'
import { json } from '@sveltejs/kit'

import { checkDatabaseReadiness } from '$lib/server/db'
import { createRedisReadinessCheck } from '$lib/server/readiness'
import { getRedisClient } from '$lib/server/redis'

import type { RequestHandler } from './$types'

import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'

export const GET: RequestHandler = async () => {
  const redis = getRedisClient()
  const result = await runReadinessChecks(
    [{ name: 'database', check: checkDatabaseReadiness }, createRedisReadinessCheck(redis, dev)],
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
