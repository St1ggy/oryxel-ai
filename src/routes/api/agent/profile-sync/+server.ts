import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { applyPatchToDatabase } from '$lib/server/ai/apply'
import { getUserDefaultProvider } from '$lib/server/ai/keys/service'
import { analyzePreferences } from '$lib/server/ai/router'
import { loadDiaryForUser } from '$lib/server/diary/load'
import { loadProfileForUser } from '$lib/server/profile/load'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  locale: z.string().min(2).max(10).optional(),
})

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = bodySchema.parse(await request.json())
  const locale = body.locale ?? 'en'

  const [profile, diary, defaultProvider] = await Promise.all([
    loadProfileForUser(locals.user.id, locals.user.name || 'User', locale),
    loadDiaryForUser(locals.user.id, locale),
    getUserDefaultProvider(locals.user.id),
  ])

  const totalEntries = diary.owned.length + diary.liked.length + diary.disliked.length + diary.to_try.length

  if (totalEntries === 0) {
    return json({ ok: true, skipped: true })
  }

  try {
    const router = await analyzePreferences({
      userId: locals.user.id,
      message: 'Sync profile based on diary.',
      locale,
      scenario: 'profile_sync',
      preferredProvider: defaultProvider ?? undefined,
      context: {
        profile: {
          displayName: profile.displayName,
          bio: profile.bio,
          archetype: profile.archetype ?? undefined,
          favoriteNote: profile.favoriteNote ?? undefined,
          radar:
            profile.radarAxes.length > 0
              ? Object.fromEntries(profile.radarAxes.map(({ key, value }) => [key, value]))
              : undefined,
        },
        diary: {
          // eslint-disable-next-line camelcase
          to_try: diary.to_try.map(({ id, brand, fragrance, pyramidTop, pyramidMid, pyramidBase }) => ({
            id,
            brand,
            fragrance,
            pyramidTop,
            pyramidMid,
            pyramidBase,
          })),
          liked: diary.liked.map(({ id, brand, fragrance, pyramidTop, pyramidMid, pyramidBase }) => ({
            id,
            brand,
            fragrance,
            pyramidTop,
            pyramidMid,
            pyramidBase,
          })),
          disliked: diary.disliked.map(({ id, brand, fragrance, pyramidTop, pyramidMid, pyramidBase }) => ({
            id,
            brand,
            fragrance,
            pyramidTop,
            pyramidMid,
            pyramidBase,
          })),
          owned: diary.owned.map(({ id, brand, fragrance, pyramidTop, pyramidMid, pyramidBase }) => ({
            id,
            brand,
            fragrance,
            pyramidTop,
            pyramidMid,
            pyramidBase,
          })),
        },
      },
    })

    await applyPatchToDatabase(locals.user.id, router.result.patch)
  } catch (syncError) {
    console.error('[profile-sync] Failed:', syncError instanceof Error ? syncError.message : syncError)
  }

  return json({ ok: true })
}
