import { loadFeedForUser } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const posts = await loadFeedForUser(locals.user.id)

  return json({ posts })
}
