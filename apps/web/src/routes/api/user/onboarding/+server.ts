import { error, json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { userProfile } from '$lib/server/db/schema'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized')

  const userId = locals.user.id

  await db.update(userProfile).set({ onboardingCompletedAt: new Date() }).where(eq(userProfile.userId, userId))

  return json({ ok: true })
}
