import { deletePost } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const postId = Number(params.id)

  if (!Number.isFinite(postId)) throw error(400, 'INVALID_ID')

  const ok = await deletePost(postId, locals.user.id)

  if (!ok) throw error(404, 'NOT_FOUND')

  return json({ ok: true })
}
