import { setJobCreatedHandler } from '@oryxel/ai/server'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import Redis from 'ioredis'

import { cookieMaxAge, cookieName, getTextDirection } from '$lib/paraglide/runtime'
import { paraglideMiddleware } from '$lib/paraglide/server'
import { auth } from '$lib/server/auth'
import { getLegacyLocaleRedirect, rewriteLegacyLocaleCookieHeader } from '$lib/server/i18n/compatibility'

import type { Handle } from '@sveltejs/kit'

import { building } from '$app/environment'
import { env } from '$env/dynamic/private'

const NEW_JOBS_CHANNEL = 'jobs:new'

if (!building && env.REDIS_URL) {
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true, protocol: 2 })

  redis.on('error', (error) => {
    console.error('[web] redis error:', error instanceof Error ? error.message : error)
  })

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
  if (path === '/healthz' || path.startsWith('/_app/') || path.startsWith('/favicon')) {
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

export const handle: Handle = sequence(
  handleLegacyLocaleCompatibility,
  handleMaintenance,
  handleParaglide,
  handleBetterAuth,
)
