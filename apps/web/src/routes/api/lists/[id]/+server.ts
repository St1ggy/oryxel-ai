import { createJob, deleteList, getListById, listItemsForList, updateList } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import type { RequestHandler } from './$types'

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(600).nullable().optional(),
  visibility: z.enum(['private', 'followers', 'public', 'unlisted']).optional(),
})

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const listId = Number(params.id)

  if (!Number.isFinite(listId)) throw error(400, 'INVALID_ID')

  const list = await getListById(listId, locals.user.id)

  if (!list) throw error(404, 'NOT_FOUND')

  const items = await listItemsForList(listId)

  return json({ list, items })
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const listId = Number(params.id)

  if (!Number.isFinite(listId)) throw error(400, 'INVALID_ID')

  const body = patchSchema.parse(await request.json())
  const previous = await getListById(listId, locals.user.id)

  if (!previous) throw error(404, 'NOT_FOUND')

  const list = await updateList(listId, locals.user.id, body)

  if (!list) throw error(404, 'NOT_FOUND')

  if (body.visibility && body.visibility !== 'private' && previous.visibility === 'private') {
    await createJob(locals.user.id, 'notify_list', { listId })
  }

  return json({ list })
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const listId = Number(params.id)

  if (!Number.isFinite(listId)) throw error(400, 'INVALID_ID')

  const ok = await deleteList(listId, locals.user.id)

  if (!ok) throw error(404, 'NOT_FOUND')

  return json({ ok: true })
}
