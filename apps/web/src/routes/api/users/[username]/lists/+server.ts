import { getProfileByUsername, listPublicListsForUser } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params, locals }) => {
  const profile = await getProfileByUsername(params.username)

  if (!profile) throw error(404, 'NOT_FOUND')

  const viewerId = locals.user?.id ?? null
  const lists = await listPublicListsForUser(profile.userId, viewerId)

  return json({ lists })
}
