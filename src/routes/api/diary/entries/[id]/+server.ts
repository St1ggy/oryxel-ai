import { error, json } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '$lib/server/db'
import { userFragrance } from '$lib/server/db/schema'
import { listTypeToFlags } from '$lib/server/diary/flags'

import type { RequestHandler } from './$types'

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const id = Number.parseInt(params.id, 10)

  if (Number.isNaN(id)) throw error(400, 'INVALID_ID')

  await db.delete(userFragrance).where(and(eq(userFragrance.id, id), eq(userFragrance.userId, locals.user.id)))

  return json({ ok: true })
}

const patchBodySchema = z.object({
  listType: z.enum(['to_try', 'liked', 'disliked', 'owned']).optional(),
  statusLabel: z.string().max(64).optional(),
  isOwned: z.boolean().optional(),
  rating: z.number().int().min(0).max(5).optional(),
})

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const id = Number.parseInt(params.id, 10)

  if (Number.isNaN(id)) throw error(400, 'INVALID_ID')

  const body = patchBodySchema.parse(await request.json())
  const updates: Partial<typeof userFragrance.$inferInsert> = {}

  if (body.listType) Object.assign(updates, listTypeToFlags(body.listType))

  if (typeof body.rating === 'number') updates.rating = body.rating

  if (typeof body.statusLabel === 'string') updates.statusLabel = body.statusLabel

  if (typeof body.isOwned === 'boolean') updates.isOwned = body.isOwned

  if (Object.keys(updates).length === 0) throw error(400, 'NO_FIELDS')

  await db
    .update(userFragrance)
    .set(updates)
    .where(and(eq(userFragrance.id, id), eq(userFragrance.userId, locals.user.id)))

  return json({ ok: true })
}
