import { redirect } from '@sveltejs/kit'

import { loadProfileForUser } from '$lib/server/profile/load'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`)
  }

  const profile = await loadProfileForUser(locals.user.id, locals.user.name || 'User')

  return { noteRelationships: profile.noteRelationships }
}
