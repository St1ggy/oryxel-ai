import { redirect } from '@sveltejs/kit'

import { getConfiguredOAuthProviders } from '$lib/server/auth/providers'
import { sanitizeRedirectTarget } from '$lib/server/auth/redirect'

import type { PageServerLoad } from './$types'

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
    providers: getConfiguredOAuthProviders(),
  }
}
