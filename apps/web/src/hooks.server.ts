import { setJobCreatedHandler } from '@oryxel/ai'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import Redis from 'ioredis'

import { getTextDirection } from '$lib/paraglide/runtime'
import { paraglideMiddleware } from '$lib/paraglide/server'
import { auth } from '$lib/server/auth'

import type { Handle } from '@sveltejs/kit'

import { building } from '$app/environment'
import { env } from '$env/dynamic/private'

const NEW_JOBS_CHANNEL = 'jobs:new'

if (!building && env.REDIS_URL) {
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true })

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

export const handle: Handle = sequence(handleParaglide, handleBetterAuth)
