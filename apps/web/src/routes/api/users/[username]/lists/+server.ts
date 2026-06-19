import { canView, getProfileByUsername, listPublicListsForUser } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params, locals }) => {
  const profile = await getProfileByUsername(params.username)

  if (!profile) throw error(404, 'NOT_FOUND')

  const lists = await listPublicListsForUser(profile.userId)
  const viewerId = locals.user?.id ?? null

  const visible = []

  for (const list of lists) {
    if (await canView(viewerId, profile.userId, list.visibility)) {
      visible.push(list)
    }
  }

  return json({ lists: visible })
}
