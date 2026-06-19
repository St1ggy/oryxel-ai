import { canView, getListBySlug, listItemsForList, listPublicListsForUser, loadPublicProfile } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params, locals }) => {
  const username = params.username?.toLowerCase()

  if (!username) throw error(400, 'INVALID_USERNAME')

  const profile = await loadPublicProfile(username, locals.user?.id ?? null)

  if (!profile) throw error(404, 'NOT_FOUND')

  return json({ profile })
}
