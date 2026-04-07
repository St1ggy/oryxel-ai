import { redirect } from '@sveltejs/kit'

import { loadProfileForUser } from '$lib/server/profile/load'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`)
  }

  const noteRelationships = loadProfileForUser(locals.user.id, locals.user.name || 'User').then(
    (profile) => profile.noteRelationships,
  )

  return { noteRelationships }
}
