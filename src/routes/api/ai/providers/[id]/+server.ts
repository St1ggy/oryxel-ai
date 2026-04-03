import { error, json } from '@sveltejs/kit'

import { deleteUserProviderKey } from '$lib/server/ai/keys/service'

import type { RequestHandler } from './$types'

function parseProviderId(rawId: string): number {
  const id = Number(rawId)

  if (!Number.isInteger(id) || id <= 0) {
    throw error(400, 'INVALID_PROVIDER_ID')
  }

  return id
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const id = parseProviderId(params.id)

  await deleteUserProviderKey(locals.user.id, id)

  return json({ ok: true })
}
