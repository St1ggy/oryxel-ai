import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { db } from '$lib/server/db'
import { userFragrance } from '$lib/server/db/schema'
import { findOrCreateBrand, findOrCreateFragrance } from '$lib/server/diary/find-or-create'
import { listTypeToFlags } from '$lib/server/diary/flags'

import type { RequestHandler } from './$types'

const postBodySchema = z.object({
  brand: z.string().min(1).max(120).trim(),
  fragrance: z.string().min(1).max(120).trim(),
  notes: z.string().max(400).trim().optional().default(''),
  listType: z.enum(['to_try', 'liked', 'disliked', 'owned']),
})

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const body = postBodySchema.parse(await request.json())
  const flags = listTypeToFlags(body.listType)

  const entry = await db.transaction(async (tx) => {
    const brandId = await findOrCreateBrand(tx, body.brand)
    const fragranceId = await findOrCreateFragrance(tx, brandId, body.fragrance, body.notes || null)

    const [inserted] = await tx
      .insert(userFragrance)
      .values({
        userId: locals.user!.id,
        fragranceId,
        rating: 0,
        ...flags,
      })
      .onConflictDoUpdate({
        target: [userFragrance.userId, userFragrance.fragranceId],
        set: flags,
      })
      .returning({ id: userFragrance.id })

    return inserted
  })

  return json({ id: entry.id })
}
