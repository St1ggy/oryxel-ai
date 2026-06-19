import { createList, listListsForUser } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import type { RequestHandler } from './$types'

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(600).optional(),
  kind: z.enum(['custom', 'diary_slice']).optional(),
  diaryFilter: z.object({ listType: z.enum(['to_try', 'liked', 'neutral', 'disliked', 'owned']) }).optional(),
  visibility: z.enum(['private', 'followers', 'public', 'unlisted']).optional(),
})

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const lists = await listListsForUser(locals.user.id)

  return json({ lists })
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const body = createSchema.parse(await request.json())
  const list = await createList(locals.user.id, body)

  return json({ list }, { status: 201 })
}
