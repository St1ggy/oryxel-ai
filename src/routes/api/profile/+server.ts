import { error, json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '$lib/server/db'
import { userProfile } from '$lib/server/db/schema'

import type { RequestHandler } from './$types'

const patchBodySchema = z.object({
  gender: z.enum(['male', 'female']).nullable(),
})

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const [row] = await db
    .select({ gender: userProfile.gender })
    .from(userProfile)
    .where(eq(userProfile.userId, locals.user.id))
    .limit(1)

  return json({ gender: row?.gender ?? null })
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = patchBodySchema.parse(await request.json())

  await db
    .insert(userProfile)
    .values({ userId: locals.user.id, gender: body.gender })
    .onConflictDoUpdate({ target: userProfile.userId, set: { gender: body.gender } })

  return json({ ok: true })
}
