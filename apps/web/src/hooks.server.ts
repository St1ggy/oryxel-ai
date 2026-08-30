import { setJobCreatedHandler } from '@oryxel/ai/server'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'

import { cookieMaxAge, cookieName, getTextDirection } from '$lib/paraglide/runtime'
import { paraglideMiddleware } from '$lib/paraglide/server'
import { auth } from '$lib/server/auth'
import { getLegacyLocaleRedirect, rewriteLegacyLocaleCookieHeader } from '$lib/server/i18n/compatibility'
import { consumeRateLimit, createRateLimitKey, resolveRateLimitPolicy } from '$lib/server/rate-limit'
import { getRedisClient } from '$lib/server/redis'

import type { RateLimitPolicy } from '$lib/server/rate-limit'
import type { Handle } from '@sveltejs/kit'

import { building } from '$app/environment'
import { env } from '$env/dynamic/private'

const NEW_JOBS_CHANNEL = 'jobs:new'

const redis = getRedisClient()

if (redis) {
  setJobCreatedHandler(async (jobId) => {
    try {
      await redis.publish(NEW_JOBS_CHANNEL, JSON.stringify({ jobId }))
    } catch (error) {
      console.error('[web] redis publish failed:', error instanceof Error ? error.message : error)
    }
  })
}

const handleMaintenance: Handle = async ({ event, resolve }) => {
  if (env.MAINTENANCE_MODE !== 'true') {
    return resolve(event)
  }

  const path = event.url.pathname

  // Let healthcheck and static assets through so Vercel/monitoring keep working.
  if (path === '/healthz' || path === '/readyz' || path.startsWith('/_app/') || path.startsWith('/favicon')) {
    return resolve(event)
  }

  return new Response('Service temporarily unavailable — database migration in progress.', {
    status: 503,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '300' },
  })
}

const handleLegacyLocaleCompatibility: Handle = ({ event, resolve }) => {
  const redirectResponse = getLegacyLocaleRedirect(event.url)

  if (redirectResponse) return redirectResponse

  const cookieHeader = event.request.headers.get('cookie')
  const normalizedCookieHeader = rewriteLegacyLocaleCookieHeader(cookieHeader, cookieName)

  if (normalizedCookieHeader !== cookieHeader) {
    event.cookies.set(cookieName, 'ja', { path: '/', maxAge: cookieMaxAge, httpOnly: false })

    const headers = new Headers(event.request.headers)

    headers.set('cookie', normalizedCookieHeader ?? '')
    event.request = new Request(event.request, { headers })
  }

  return resolve(event)
}

const handleParaglide: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }) => {
    event.request = request

    return resolve(event, {
      transformPageChunk: ({ html }) =>
        html.replace('%paraglide.lang%', locale).replace('%paraglide.dir%', getTextDirection(locale)),
    })
  })

const handleBetterAuth: Handle = async ({ event, resolve }) => {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null

  try {
    session = await auth.api.getSession({ headers: event.request.headers })
  } catch {
    session = null
  }

  if (session) {
    event.locals.session = session.session
    event.locals.user = session.user
  }

  return svelteKitHandler({ event, resolve, auth, building })
}

function rateLimitErrorResponse(
  error: 'RATE_LIMITED' | 'RATE_LIMIT_UNAVAILABLE',
  status: 429 | 503,
  retryAfter: number,
) {
  return Response.json(
    { error },
    {
      status,
      headers: {
        'cache-control': 'no-store',
        'retry-after': String(retryAfter),
      },
    },
  )
}

function getRateLimitIdentity(userId: string | undefined, getClientAddress: () => string) {
  return userId ? `user:${userId}` : `ip:${getClientAddress()}`
}

function rateLimitUnavailableResponse(policy: RateLimitPolicy, error: unknown, message: string) {
  // eslint-disable-next-line no-console -- dependency failures need to be visible in function logs
  console.error(message, error instanceof Error ? error.message : error)

  return policy.failClosed ? rateLimitErrorResponse('RATE_LIMIT_UNAVAILABLE', 503, 30) : null
}

const handleRateLimit: Handle = async ({ event, resolve }) => {
  const policy = resolveRateLimitPolicy(event.url.pathname, event.request.method)

  if (!policy || !redis) return resolve(event)

  let identity: string

  try {
    identity = getRateLimitIdentity(event.locals.user?.id, () => event.getClientAddress())
  } catch (error) {
    return (
      rateLimitUnavailableResponse(policy, error, '[web] client address unavailable for rate limiting:') ??
      resolve(event)
    )
  }

  try {
    const decision = await consumeRateLimit(redis, createRateLimitKey(policy.scope, identity), policy)

    if (!decision.allowed) {
      return rateLimitErrorResponse('RATE_LIMITED', 429, decision.retryAfterSeconds)
    }
  } catch (error) {
    return rateLimitUnavailableResponse(policy, error, '[web] rate limit check failed:') ?? resolve(event)
  }

  return resolve(event)
}

export const handle: Handle = sequence(
  handleLegacyLocaleCompatibility,
  handleMaintenance,
  handleParaglide,
  handleBetterAuth,
  handleRateLimit,
)
