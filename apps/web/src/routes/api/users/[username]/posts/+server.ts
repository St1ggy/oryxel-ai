import { getProfileByUsername, listPostsForAuthor } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params, locals }) => {
  const profile = await getProfileByUsername(params.username)

  if (!profile) throw error(404, 'NOT_FOUND')

  const posts = await listPostsForAuthor(profile.userId, locals.user?.id ?? null)

  return json({ posts })
}
