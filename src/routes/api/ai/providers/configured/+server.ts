import { error, json } from '@sveltejs/kit'

import { listConfiguredProviderIds } from '$lib/server/ai/keys/service'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const providers = await listConfiguredProviderIds(locals.user.id)

  return json({ providers })
}
