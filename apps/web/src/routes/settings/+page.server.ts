import { redirect } from '@sveltejs/kit'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url }) => {
  const path = url.pathname.replace(/\/$/, '')

  throw redirect(302, `${path}/profile`)
}
