import { normalizeUsername, validateUsername } from '@oryxel/ai/server'
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
  /** Free-form scent likes/dislikes — same column AI patches; max aligned with structured patch schema. */
  preferences: z.string().max(2000).optional(),
  username: z.string().max(30).optional(),
  isDiscoverable: z.boolean().optional(),
  defaultListVisibility: z.enum(['private', 'followers', 'public', 'unlisted']).optional(),
  defaultPostVisibility: z.enum(['private', 'followers', 'public', 'unlisted']).optional(),
  showDiaryStats: z.boolean().optional(),
})

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const [row] = await db
    .select({
      gender: userProfile.gender,
      displayName: userProfile.displayName,
      bio: userProfile.bio,
      preferences: userProfile.preferences,
      username: userProfile.username,
      isDiscoverable: userProfile.isDiscoverable,
      defaultListVisibility: userProfile.defaultListVisibility,
      defaultPostVisibility: userProfile.defaultPostVisibility,
      showDiaryStats: userProfile.showDiaryStats,
    })
    .from(userProfile)
    .where(eq(userProfile.userId, locals.user.id))
    .limit(1)

  return json({
    gender: row?.gender ?? null,
    displayName: row?.displayName ?? null,
    bio: row?.bio ?? null,
    preferences: row?.preferences ?? null,
    username: row?.username ?? null,
    isDiscoverable: row?.isDiscoverable ?? false,
    defaultListVisibility: row?.defaultListVisibility ?? 'private',
    defaultPostVisibility: row?.defaultPostVisibility ?? 'followers',
    showDiaryStats: row?.showDiaryStats ?? false,
  })
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

  if (body.preferences !== undefined) {
    updates['preferences'] = body.preferences.trim() === '' ? null : body.preferences
  }

  if (body.username !== undefined) {
    const normalized = normalizeUsername(body.username)

    if (normalized.length === 0) {
      updates['username'] = null
    } else {
      const usernameError = validateUsername(normalized)

      if (usernameError) throw error(400, usernameError)

      updates['username'] = normalized
    }
  }

  if (body.isDiscoverable !== undefined) updates['isDiscoverable'] = body.isDiscoverable

  if (body.defaultListVisibility !== undefined) updates['defaultListVisibility'] = body.defaultListVisibility

  if (body.defaultPostVisibility !== undefined) updates['defaultPostVisibility'] = body.defaultPostVisibility

  if (body.showDiaryStats !== undefined) updates['showDiaryStats'] = body.showDiaryStats

  await db
    .insert(userProfile)
    .values({ userId: locals.user.id, ...updates })
    .onConflictDoUpdate({ target: userProfile.userId, set: updates })

  return json({ ok: true })
}
