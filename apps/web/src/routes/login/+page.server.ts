import { redirect } from '@sveltejs/kit'

import { sanitizeRedirectTarget } from '$lib/server/auth/redirect'

import type { PageServerLoad } from './$types'

import { env } from '$env/dynamic/private'

export const load: PageServerLoad = async ({ locals, url }) => {
  const requestedRedirect = url.searchParams.get('redirectTo')
  const redirectTo = requestedRedirect ? sanitizeRedirectTarget(requestedRedirect) : '/diary'
  const intent = url.searchParams.get('intent') === 'signup' ? 'signup' : 'signin'

  if (locals.user) {
    throw redirect(302, redirectTo)
  }

  return {
    redirectTo,
    intent,
    providers: {
      google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      apple: Boolean(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET),
    },
  }
}
