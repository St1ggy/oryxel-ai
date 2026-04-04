import { error, json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '$lib/server/db'
import { userProfile } from '$lib/server/db/schema'

import type { RequestHandler } from './$types'

const patchBodySchema = z.object({
  gender: z.enum(['male', 'female']).nullable().optional(),
  displayName: z.string().max(120).optional(),
  bio: z.string().max(600).optional(),
})

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const [row] = await db
    .select({ gender: userProfile.gender, displayName: userProfile.displayName, bio: userProfile.bio })
    .from(userProfile)
    .where(eq(userProfile.userId, locals.user.id))
    .limit(1)

  return json({ gender: row?.gender ?? null, displayName: row?.displayName ?? null, bio: row?.bio ?? null })
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = patchBodySchema.parse(await request.json())

  const updates: Record<string, unknown> = {}

  if (body.gender !== undefined) updates['gender'] = body.gender

  if (body.displayName !== undefined) updates['displayName'] = body.displayName

  if (body.bio !== undefined) updates['bio'] = body.bio

  await db
    .insert(userProfile)
    .values({ userId: locals.user.id, ...updates })
    .onConflictDoUpdate({ target: userProfile.userId, set: updates })

  return json({ ok: true })
}
