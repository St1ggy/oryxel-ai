import { error, json } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '$lib/server/db'
import { brand, fragrance, userFragrance } from '$lib/server/db/schema'
import { recordActivity } from '$lib/server/diary/activity'
import { listTypeToFlags } from '$lib/server/diary/flags'

import type { RequestHandler } from './$types'

async function getFragranceLabel(entryId: number, userId: string): Promise<string> {
  const [row] = await db
    .select({ brandName: brand.name, fragName: fragrance.name })
    .from(userFragrance)
    .innerJoin(fragrance, eq(userFragrance.fragranceId, fragrance.id))
    .innerJoin(brand, eq(fragrance.brandId, brand.id))
    .where(and(eq(userFragrance.id, entryId), eq(userFragrance.userId, userId)))
    .limit(1)

  return row ? `${row.brandName} · ${row.fragName}` : `#${entryId}`
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const id = Number.parseInt(params.id, 10)

  if (Number.isNaN(id)) throw error(400, 'INVALID_ID')

  const label = await getFragranceLabel(id, locals.user.id)

  await db.delete(userFragrance).where(and(eq(userFragrance.id, id), eq(userFragrance.userId, locals.user.id)))

  void recordActivity({
    userId: locals.user.id,
    action: 'entry_deleted',
    actor: 'user',
    summary: `Removed: ${label}`,
  })

  return json({ ok: true })
}

const patchBodySchema = z.object({
  listType: z.enum(['to_try', 'liked', 'disliked', 'owned']).optional(),
  userComment: z.string().max(200).optional(),
  isOwned: z.boolean().optional(),
  rating: z.number().int().min(0).max(5).optional(),
  season: z.string().max(60).optional(),
  timeOfDay: z.string().max(40).optional(),
  gender: z.enum(['female', 'male', 'unisex']).optional(),
})

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const id = Number.parseInt(params.id, 10)

  if (Number.isNaN(id)) throw error(400, 'INVALID_ID')

  const body = patchBodySchema.parse(await request.json())
  const updates: Partial<typeof userFragrance.$inferInsert> = {}

  if (body.listType) Object.assign(updates, listTypeToFlags(body.listType))

  if (typeof body.rating === 'number') updates.rating = body.rating

  if (typeof body.userComment === 'string') updates.userComment = body.userComment

  if (typeof body.isOwned === 'boolean') updates.isOwned = body.isOwned

  if (typeof body.season === 'string') updates.season = body.season

  if (typeof body.timeOfDay === 'string') updates.timeOfDay = body.timeOfDay

  if (typeof body.gender === 'string') updates.gender = body.gender

  if (Object.keys(updates).length === 0) throw error(400, 'NO_FIELDS')

  const label = await getFragranceLabel(id, locals.user.id)

  await db
    .update(userFragrance)
    .set(updates)
    .where(and(eq(userFragrance.id, id), eq(userFragrance.userId, locals.user.id)))

  function buildSummary(): string {
    if (typeof body.rating === 'number') return `Rated ${label}: ${body.rating}★`
    if (body.listType) return `Moved ${label} → ${body.listType}`
    if (typeof body.userComment === 'string') return `Commented on ${label}`

    return `Updated ${label}`
  }

  void recordActivity({
    userId: locals.user.id,
    action: 'entry_updated',
    actor: 'user',
    summary: buildSummary(),
  })

  return json({ ok: true })
}
