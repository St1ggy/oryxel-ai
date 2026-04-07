import { redirect } from '@sveltejs/kit'

import { getConfiguredOAuthProviders } from '$lib/server/auth/providers'

import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`)
  }

  return {
    configuredOAuthProviders: getConfiguredOAuthProviders(),
  }
}
