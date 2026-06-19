import { canView, getListBySlug, getProfileByUsername, listItemsForList } from '@oryxel/ai/server'
import { error } from '@sveltejs/kit'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const username = params.username?.toLowerCase()
  const slug = params.slug

  if (!username || !slug) throw error(400, 'INVALID_PARAMS')

  const profile = await getProfileByUsername(username)

  if (!profile) throw error(404, 'NOT_FOUND')

  const list = await getListBySlug(profile.userId, slug)

  if (!list) throw error(404, 'NOT_FOUND')

  const viewerId = locals.user?.id ?? null

  if (!(await canView(viewerId, profile.userId, list.visibility))) {
    throw error(403, 'FORBIDDEN')
  }

  const items = await listItemsForList(list.id)

  return {
    profile,
    list,
    items,
  }
}
