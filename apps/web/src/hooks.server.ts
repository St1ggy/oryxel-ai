import { building } from '$app/environment'
import { sequence } from '@sveltejs/kit/hooks'
import { svelteKitHandler } from 'better-auth/svelte-kit'

import { getTextDirection } from '$lib/paraglide/runtime'
import { paraglideMiddleware } from '$lib/paraglide/server'
import { auth } from '$lib/server/auth'

import type { Handle } from '@sveltejs/kit'

const handleParaglide: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }) => {
    event.request = request

    return resolve(event, {
      transformPageChunk: ({ html }) =>
        html.replace('%paraglide.lang%', locale).replace('%paraglide.dir%', getTextDirection(locale)),
    })
  })

const handleBetterAuth: Handle = async ({ event, resolve }) => {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null

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
