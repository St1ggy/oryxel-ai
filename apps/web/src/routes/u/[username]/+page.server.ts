import { canView, listPostsForAuthor, listPublicListsForUser, loadPublicProfile } from '@oryxel/ai/server'
import { error } from '@sveltejs/kit'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const username = params.username?.toLowerCase()

  if (!username) throw error(400, 'INVALID_USERNAME')

  const profile = await loadPublicProfile(username, locals.user?.id ?? null)

  if (!profile) throw error(404, 'NOT_FOUND')

  const lists = await listPublicListsForUser(profile.userId)
  const viewerId = locals.user?.id ?? null
  const visibleLists = []

  for (const list of lists) {
    if (await canView(viewerId, profile.userId, list.visibility)) {
      visibleLists.push(list)
    }
  }

  const posts = await listPostsForAuthor(profile.userId, viewerId)

  return {
    profile,
    lists: visibleLists,
    posts,
    viewerId,
  }
}
