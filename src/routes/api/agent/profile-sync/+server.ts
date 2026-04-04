import { error } from '@sveltejs/kit'
import { z } from 'zod'

import { applyPatchToDatabase } from '$lib/server/ai/apply'
import { getUserDefaultProvider } from '$lib/server/ai/keys/service'
import { analyzePreferences } from '$lib/server/ai/router'
import { loadDiaryForUser } from '$lib/server/diary/load'
import { loadProfileForUser } from '$lib/server/profile/load'
import { generateMissingTranslations } from '$lib/server/translation/generate'

import type { AnalyzePreferencesRequest } from '$lib/server/ai/contracts'
import type { RequestHandler } from './$types'

const bodySchema = z.object({
  locale: z.string().min(2).max(10).optional(),
})

const BATCH_SIZE = 10

type DiaryEntry = { id: number; brand: string; fragrance: string }
type SyncPhase = 'owned' | 'liked' | 'disliked' | 'profile' | 'recommendations' | 'to_try'
type SyncEvent = { step: number; total: number; phase: SyncPhase } | { done: true }

type StepContext = {
  userId: string
  userName: string
  locale: string
  provider: AnalyzePreferencesRequest['preferredProvider']
  profileContext: NonNullable<AnalyzePreferencesRequest['context']>['profile']
  likedEntries: DiaryEntry[]
  dislikedEntries: DiaryEntry[]
  ownedEntries: DiaryEntry[]
}

const FILL_BATCH_MSG =
  'Fill data for every fragrance in the listed entries. For each entry generate op=status with rowId, setting all of: notesSummary (up to 5 notes, lowercase English), pyramidTop/Mid/Base (lowercase English, all three tiers), agentComment (max 80 chars), season (comma-separated from spring/summer/autumn/winter), timeOfDay (comma-separated from day/evening/night), gender (female/male/unisex). One op=status per entry, no exceptions.'

function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = []

  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size))
  }

  return result
}

async function fillListBatches(
  context: StepContext,
  entries: DiaryEntry[],
  phase: Exclude<SyncPhase, 'profile' | 'recommendations' | 'to_try'>,
  startStep: number,
  total: number,
  send: (event: SyncEvent) => void,
): Promise<void> {
  const batches = chunk(entries, BATCH_SIZE)

  for (const [index, batch] of batches.entries()) {
    send({ step: startStep + index, total, phase })

    try {
      const batchRouter = await analyzePreferences({
        userId: context.userId,
        message: FILL_BATCH_MSG,
        locale: context.locale,
        scenario: 'command',
        preferredProvider: context.provider,
        context: {
          profile: context.profileContext,
          diary: {
            // eslint-disable-next-line camelcase
            to_try: [],
            liked: phase === 'liked' ? batch : [],
            disliked: phase === 'disliked' ? batch : [],
            owned: phase === 'owned' ? batch : [],
          },
        },
      })

      await applyPatchToDatabase(context.userId, batchRouter.result.patch)
    } catch (batchError) {
      console.error(
        `[profile-sync] ${phase} batch ${index + 1}/${batches.length} failed:`,
        batchError instanceof Error ? batchError.message : batchError,
      )
    }
  }
}

async function runProfileStep(context: StepContext): Promise<void> {
  try {
    const profileRouter = await analyzePreferences({
      userId: context.userId,
      message: 'Update my fragrance profile statistics based on the diary. Do not fill entry data.',
      locale: context.locale,
      scenario: 'profile_sync',
      preferredProvider: context.provider,
      context: {
        profile: context.profileContext,
        diary: {
          // eslint-disable-next-line camelcase
          to_try: [],
          liked: context.likedEntries,
          disliked: context.dislikedEntries,
          owned: context.ownedEntries,
        },
      },
    })

    await applyPatchToDatabase(context.userId, profileRouter.result.patch)
  } catch (error_) {
    console.error('[profile-sync] Profile update failed:', error_ instanceof Error ? error_.message : error_)
  }
}

async function runRecommendationsStep(context: StepContext): Promise<void> {
  try {
    const updatedProfile = await loadProfileForUser(context.userId, context.userName, context.locale)
    const recRouter = await analyzePreferences({
      userId: context.userId,
      message: 'Suggest fragrances I would enjoy based on my profile.',
      locale: context.locale,
      scenario: 'recommendation',
      preferredProvider: context.provider,
      context: {
        profile: {
          archetype: updatedProfile.archetype ?? undefined,
          favoriteNote: updatedProfile.favoriteNote ?? undefined,
          preferences: updatedProfile.preferences || undefined,
          radar:
            updatedProfile.radarAxes.length > 0
              ? Object.fromEntries(updatedProfile.radarAxes.map(({ key, value }) => [key, value]))
              : undefined,
        },
        diary: {
          // eslint-disable-next-line camelcase
          to_try: [],
          liked: context.likedEntries,
          disliked: context.dislikedEntries,
          owned: context.ownedEntries,
        },
      },
    })

    await applyPatchToDatabase(context.userId, recRouter.result.patch)
  } catch (error_) {
    console.error('[profile-sync] Recommendations failed:', error_ instanceof Error ? error_.message : error_)
  }
}

async function runToTryFillStep(context: StepContext): Promise<void> {
  try {
    const updatedDiary = await loadDiaryForUser(context.userId, context.locale)
    const toTryEntries = updatedDiary.to_try.map(({ id, brand, fragrance }) => ({ id, brand, fragrance }))
    const toTryBatches = chunk(toTryEntries, BATCH_SIZE)

    for (const [batchIndex, batch] of toTryBatches.entries()) {
      try {
        const batchRouter = await analyzePreferences({
          userId: context.userId,
          message: FILL_BATCH_MSG,
          locale: context.locale,
          scenario: 'command',
          preferredProvider: context.provider,
          context: {
            profile: context.profileContext,
            diary: {
              // eslint-disable-next-line camelcase
              to_try: batch,
              liked: [],
              disliked: [],
              owned: [],
            },
          },
        })

        await applyPatchToDatabase(context.userId, batchRouter.result.patch)
      } catch (batchError) {
        console.error(
          `[profile-sync] to_try batch ${batchIndex + 1}/${toTryBatches.length} failed:`,
          batchError instanceof Error ? batchError.message : batchError,
        )
      }
    }
  } catch (error_) {
    console.error('[profile-sync] to_try fill failed:', error_ instanceof Error ? error_.message : error_)
  }
}

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
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
      },
    })

    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
  }

  const ownedEntries = diary.owned.map(({ id, brand, fragrance }) => ({ id, brand, fragrance }))
  const likedEntries = diary.liked.map(({ id, brand, fragrance }) => ({ id, brand, fragrance }))
  const dislikedEntries = diary.disliked.map(({ id, brand, fragrance }) => ({ id, brand, fragrance }))

  const ownedBatches = chunk(ownedEntries, BATCH_SIZE).length
  const likedBatches = chunk(likedEntries, BATCH_SIZE).length
  const dislikedBatches = chunk(dislikedEntries, BATCH_SIZE).length

  const hasPreferences = ownedEntries.length + likedEntries.length + dislikedEntries.length > 0

  // Total steps: one per batch per list + profile step + recommendations + to_try fill
  const total = ownedBatches + likedBatches + dislikedBatches + 1 + (hasPreferences ? 2 : 0)

  const context: StepContext = {
    userId: locals.user.id,
    userName: locals.user.name || 'User',
    locale,
    provider: defaultProvider ?? undefined,
    profileContext: {
      archetype: profile.archetype ?? undefined,
      favoriteNote: profile.favoriteNote ?? undefined,
      preferences: profile.preferences || undefined,
      radar:
        profile.radarAxes.length > 0
          ? Object.fromEntries(profile.radarAxes.map(({ key, value }) => [key, value]))
          : undefined,
    },
    likedEntries,
    dislikedEntries,
    ownedEntries,
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SyncEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      let step = 1

      if (ownedEntries.length > 0) {
        await fillListBatches(context, ownedEntries, 'owned', step, total, send)
        step += ownedBatches
      }

      if (likedEntries.length > 0) {
        await fillListBatches(context, likedEntries, 'liked', step, total, send)
        step += likedBatches
      }

      if (dislikedEntries.length > 0) {
        await fillListBatches(context, dislikedEntries, 'disliked', step, total, send)
        step += dislikedBatches
      }

      send({ step, total, phase: 'profile' })
      await runProfileStep(context)
      step++

      if (hasPreferences) {
        send({ step, total, phase: 'recommendations' })
        await runRecommendationsStep(context)
        step++

        send({ step, total, phase: 'to_try' })
        await runToTryFillStep(context)
      }

      await generateMissingTranslations(locals.user!.id, locale)

      send({ done: true })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
