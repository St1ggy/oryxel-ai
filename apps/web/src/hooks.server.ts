import { setJobCreatedHandler } from '@oryxel/ai/server'
import { logError, logEvent, resolveRequestId } from '@oryxel/runtime'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'

import { cookieMaxAge, cookieName, getTextDirection } from '$lib/paraglide/runtime'
import { paraglideMiddleware } from '$lib/paraglide/server'
import { auth } from '$lib/server/auth'
import { getLegacyLocaleRedirect, rewriteLegacyLocaleCookieHeader } from '$lib/server/i18n/compatibility'
import { consumeRateLimit, createRateLimitKey, resolveRateLimitPolicy } from '$lib/server/rate-limit'
import { getRedisClient } from '$lib/server/redis'

import type { RateLimitPolicy } from '$lib/server/rate-limit'
import type { LogLevel } from '@oryxel/runtime'
import type { Handle, HandleServerError } from '@sveltejs/kit'

import { building } from '$app/environment'
import { env } from '$env/dynamic/private'

const NEW_JOBS_CHANNEL = 'jobs:new'

const redis = getRedisClient()

if (redis) {
  setJobCreatedHandler(async (jobId) => {
    try {
      await redis.publish(NEW_JOBS_CHANNEL, JSON.stringify({ jobId }))
    } catch (error) {
      logError('web', 'job.publish.failed', error, { jobId, component: 'redis' })
    }
  })
}

function withRequestId(response: Response, requestId: string) {
  try {
    response.headers.set('x-request-id', requestId)

    return response
  } catch {
    const headers = new Headers(response.headers)

    headers.set('x-request-id', requestId)

    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  }
}

function shouldLogRequest(path: string, status: number) {
  if (path.startsWith('/_app/') || path.startsWith('/favicon')) return false

  return status >= 400 || (path !== '/healthz' && path !== '/readyz')
}

function httpLogLevel(status: number): LogLevel {
  if (status >= 500) return 'error'

  if (status >= 400) return 'warn'

  return 'info'
}

const handleObservability: Handle = async ({ event, resolve }) => {
  const requestId = resolveRequestId(event.request.headers.get('x-request-id'))
  const startedAt = performance.now()

  event.locals.requestId = requestId

  try {
    const response = withRequestId(await resolve(event), requestId)
    const requestPath = event.url.pathname
    const routeId = event.route.id ?? 'unmatched'

    if (shouldLogRequest(requestPath, response.status)) {
      logEvent(
        'web',
        'http.request.completed',
        {
          requestId,
          method: event.request.method,
          path: routeId,
          status: response.status,
          durationMs: Math.round(performance.now() - startedAt),
        },
        httpLogLevel(response.status),
      )
    }

    return response
  } catch (error) {
    logError('web', 'http.request.failed', error, {
      requestId,
      method: event.request.method,
      path: event.route.id ?? 'unmatched',
      durationMs: Math.round(performance.now() - startedAt),
    })

    throw error
  }
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
  } catch (error) {
    logError('web', 'auth.session.failed', error, {
      requestId: event.locals.requestId,
      method: event.request.method,
      path: event.route.id ?? 'unmatched',
    })
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

function rateLimitUnavailableResponse(policy: RateLimitPolicy, error: unknown, component: string) {
  logError('web', 'rate_limit.unavailable', error, { component, mode: policy.failClosed ? 'fail_closed' : 'fail_open' })

  return policy.failClosed ? rateLimitErrorResponse('RATE_LIMIT_UNAVAILABLE', 503, 30) : null
}

const handleRateLimit: Handle = async ({ event, resolve }) => {
  const policy = resolveRateLimitPolicy(event.url.pathname, event.request.method)

  if (!policy || !redis) return resolve(event)

  let identity: string

  try {
    identity = getRateLimitIdentity(event.locals.user?.id, () => event.getClientAddress())
  } catch (error) {
    return rateLimitUnavailableResponse(policy, error, 'client_address') ?? resolve(event)
  }

  try {
    const decision = await consumeRateLimit(redis, createRateLimitKey(policy.scope, identity), policy)

    if (!decision.allowed) {
      return rateLimitErrorResponse('RATE_LIMITED', 429, decision.retryAfterSeconds)
    }
  } catch (error) {
    return rateLimitUnavailableResponse(policy, error, 'redis') ?? resolve(event)
  }

  return resolve(event)
}

export const handle: Handle = sequence(
  handleObservability,
  handleLegacyLocaleCompatibility,
  handleMaintenance,
  handleParaglide,
  handleBetterAuth,
  handleRateLimit,
)

export const handleError: HandleServerError = ({ error, event, status, message }) => {
  const requestId = event.locals.requestId ?? resolveRequestId(event.request.headers.get('x-request-id'))

  logError('web', 'http.server.error', error, {
    requestId,
    method: event.request.method,
    path: event.route.id ?? 'unmatched',
    status,
  })

  return { message, requestId }
}
