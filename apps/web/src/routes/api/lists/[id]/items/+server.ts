import { addListItem, removeListItem } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import type { RequestHandler } from './$types'

const addSchema = z.object({
  fragranceId: z.number().int().positive(),
  userFragranceId: z.number().int().positive().optional(),
  note: z.string().max(400).optional(),
})

const deleteSchema = z.object({
  itemId: z.number().int().positive(),
})

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const listId = Number(params.id)

  if (!Number.isFinite(listId)) throw error(400, 'INVALID_ID')

  const body = addSchema.parse(await request.json())
  const item = await addListItem(listId, locals.user.id, body)

  if (!item) throw error(400, 'CANNOT_ADD')

  return json({ item }, { status: 201 })
}

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const listId = Number(params.id)

  if (!Number.isFinite(listId)) throw error(400, 'INVALID_ID')

  const body = deleteSchema.parse(await request.json())
  const ok = await removeListItem(listId, locals.user.id, body.itemId)

  if (!ok) throw error(404, 'NOT_FOUND')

  return json({ ok: true })
}
