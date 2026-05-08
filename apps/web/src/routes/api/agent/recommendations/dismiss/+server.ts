import { error, json } from '@sveltejs/kit'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '$lib/server/db'
import { aiRecommendationDismissed, userFragrance } from '$lib/server/db/schema'

import type { RequestHandler } from './$types'

const dismissBodySchema = z.object({
  fragranceId: z.number().int().positive(),
  reason: z.string().trim().max(200).optional(),
})

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = dismissBodySchema.parse(await request.json())

  await db
    .insert(aiRecommendationDismissed)
    .values({ userId: locals.user.id, fragranceId: body.fragranceId, reason: body.reason ?? null })
    .onConflictDoUpdate({
      target: [aiRecommendationDismissed.userId, aiRecommendationDismissed.fragranceId],
      set: { reason: body.reason ?? null, dismissedAt: sql`now()` },
    })

  await db
    .delete(userFragrance)
    .where(
      and(
        eq(userFragrance.userId, locals.user.id),
        eq(userFragrance.fragranceId, body.fragranceId),
        eq(userFragrance.isRecommendation, true),
        eq(userFragrance.isTried, false),
      ),
    )

  return json({ ok: true })
}
