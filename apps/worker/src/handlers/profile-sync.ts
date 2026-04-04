import {
  analyzePreferences,
  applyPatchToDatabase,
  completeJob,
  failJob,
  generateMissingTranslations,
  getUserDefaultProvider,
  loadDiaryForUser,
  loadProfileForUser,
  pushJobProgress,
  recordActivity,
} from '@oryxel/ai'
import { db, userAiPreferences } from '@oryxel/db'
import { eq } from 'drizzle-orm'

import type { AnalyzePreferencesRequest } from '@oryxel/ai'

const BATCH_SIZE = 10

type DiaryEntry = { id: number; brand: string; fragrance: string }
type SyncPhase = 'owned' | 'liked' | 'neutral' | 'disliked' | 'profile' | 'recommendations' | 'to_try'

type StepContext = {
  userId: string
  userName: string
  locale: string
  provider: AnalyzePreferencesRequest['preferredProvider']
  minRecommendations: number | undefined
  maxRecommendations: number | undefined
  maxPyramidNotes: number | undefined
  tone: string | undefined
  depth: string | undefined
  profileContext: NonNullable<AnalyzePreferencesRequest['context']>['profile']
  likedEntries: DiaryEntry[]
  neutralEntries: DiaryEntry[]
  dislikedEntries: DiaryEntry[]
  ownedEntries: DiaryEntry[]
}

const FILL_BATCH_MSG =
  'Fill MISSING data for every fragrance in the listed entries. For each entry generate op=status with rowId. Only set a field if it is currently null/empty — DO NOT overwrite fields that already have values. Fields to fill if missing: notesSummary (up to 5 notes, lowercase English), pyramidTop/Mid/Base (lowercase English, all three tiers), agentComment (max 80 chars), season (comma-separated from spring/summer/autumn/winter), timeOfDay (comma-separated from day/evening/night), gender (female/male/unisex). One op=status per entry, no exceptions.'

function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = []

  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size))
  }

  return result
}

async function fillListBatches(
  jobId: number,
  context: StepContext,
  entries: DiaryEntry[],
  phase: Exclude<SyncPhase, 'profile' | 'recommendations' | 'to_try'>,
  startStep: number,
  total: number,
): Promise<void> {
  const batches = chunk(entries, BATCH_SIZE)

  for (const [index, batch] of batches.entries()) {
    await pushJobProgress(jobId, { step: startStep + index, total, phase })

    try {
      const batchRouter = await analyzePreferences({
        userId: context.userId,
        message: FILL_BATCH_MSG,
        locale: context.locale,
        scenario: 'command',
        preferredProvider: context.provider,
        maxPyramidNotes: context.maxPyramidNotes,
        tone: context.tone,
        depth: context.depth,
        context: {
          profile: context.profileContext,
          diary: {
            to_try: [],
            liked: phase === 'liked' ? batch : [],
            neutral: phase === 'neutral' ? batch : [],
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
      tone: context.tone,
      depth: context.depth,
      context: {
        profile: context.profileContext,
        diary: {
          to_try: [],
          liked: context.likedEntries,
          neutral: context.neutralEntries,
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
      minRecommendations: context.minRecommendations,
      maxRecommendations: context.maxRecommendations,
      tone: context.tone,
      depth: context.depth,
      context: {
        profile: {
          archetype: updatedProfile.archetype ?? undefined,
          favoriteNote: updatedProfile.favoriteNote ?? undefined,
          preferences: updatedProfile.preferences || undefined,
          radar:
            updatedProfile.radarAxes.length > 0
              ? Object.fromEntries(updatedProfile.radarAxes.map(({ key, value }) => [key, value]))
              : undefined,
          gender: updatedProfile.gender ?? undefined,
          noteRelationships: updatedProfile.noteRelationships.length > 0 ? updatedProfile.noteRelationships : undefined,
        },
        diary: {
          to_try: [],
          liked: context.likedEntries,
          neutral: context.neutralEntries,
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
          maxPyramidNotes: context.maxPyramidNotes,
          tone: context.tone,
          depth: context.depth,
          context: {
            profile: context.profileContext,
            diary: {
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

async function runSync(jobId: number, context: StepContext, total: number, hasPreferences: boolean): Promise<void> {
  let step = 1

  const ownedBatches = chunk(context.ownedEntries, BATCH_SIZE).length
  const likedBatches = chunk(context.likedEntries, BATCH_SIZE).length
  const neutralBatches = chunk(context.neutralEntries, BATCH_SIZE).length
  const dislikedBatches = chunk(context.dislikedEntries, BATCH_SIZE).length

  if (context.ownedEntries.length > 0) {
    await fillListBatches(jobId, context, context.ownedEntries, 'owned', step, total)
    step += ownedBatches
  }

  if (context.likedEntries.length > 0) {
    await fillListBatches(jobId, context, context.likedEntries, 'liked', step, total)
    step += likedBatches
  }

  if (context.neutralEntries.length > 0) {
    await fillListBatches(jobId, context, context.neutralEntries, 'neutral', step, total)
    step += neutralBatches
  }

  if (context.dislikedEntries.length > 0) {
    await fillListBatches(jobId, context, context.dislikedEntries, 'disliked', step, total)
    step += dislikedBatches
  }

  await pushJobProgress(jobId, { step, total, phase: 'profile' })
  await runProfileStep(context)
  step++

  if (hasPreferences) {
    await pushJobProgress(jobId, { step, total, phase: 'recommendations' })
    await runRecommendationsStep(context)
    step++

    await pushJobProgress(jobId, { step, total, phase: 'to_try' })
    await runToTryFillStep(context)
  }

  await generateMissingTranslations(context.userId, context.locale)

  void recordActivity({
    userId: context.userId,
    action: 'profile_synced',
    actor: 'agent',
    provider: context.provider,
    summary: `Profile synced (${context.ownedEntries.length + context.likedEntries.length + context.neutralEntries.length + context.dislikedEntries.length} entries)`,
  })

  await completeJob(jobId, { triggerSync: true })
}

export async function handleProfileSync(
  jobId: number,
  userId: string,
  userName: string,
  params: Record<string, unknown>,
): Promise<void> {
  const locale = (params['locale'] as string | undefined) ?? 'en'

  try {
    const [profile, diary, defaultProvider, aiPrefs] = await Promise.all([
      loadProfileForUser(userId, userName, locale),
      loadDiaryForUser(userId, locale),
      getUserDefaultProvider(userId),
      db
        .select({
          minRecommendations: userAiPreferences.minRecommendations,
          maxRecommendations: userAiPreferences.maxRecommendations,
          maxPyramidNotes: userAiPreferences.maxPyramidNotes,
          tone: userAiPreferences.tone,
          depth: userAiPreferences.depth,
        })
        .from(userAiPreferences)
        .where(eq(userAiPreferences.userId, userId))
        .limit(1)
        .then((rows) => rows[0]),
    ])

    const totalEntries =
      diary.owned.length + diary.liked.length + diary.neutral.length + diary.disliked.length + diary.to_try.length

    if (totalEntries === 0) {
      await completeJob(jobId, { triggerSync: false })

      return
    }

    const ownedEntries = diary.owned.map(({ id, brand, fragrance }) => ({ id, brand, fragrance }))
    const likedEntries = diary.liked.map(({ id, brand, fragrance }) => ({ id, brand, fragrance }))
    const neutralEntries = diary.neutral.map(({ id, brand, fragrance }) => ({ id, brand, fragrance }))
    const dislikedEntries = diary.disliked.map(({ id, brand, fragrance }) => ({ id, brand, fragrance }))

    const ownedBatches = chunk(ownedEntries, BATCH_SIZE).length
    const likedBatches = chunk(likedEntries, BATCH_SIZE).length
    const neutralBatches = chunk(neutralEntries, BATCH_SIZE).length
    const dislikedBatches = chunk(dislikedEntries, BATCH_SIZE).length

    const hasPreferences =
      ownedEntries.length + likedEntries.length + neutralEntries.length + dislikedEntries.length > 0
    const total = ownedBatches + likedBatches + neutralBatches + dislikedBatches + 1 + (hasPreferences ? 2 : 0)

    const syncContext: StepContext = {
      userId,
      userName,
      locale,
      provider: defaultProvider ?? undefined,
      minRecommendations: aiPrefs?.minRecommendations,
      maxRecommendations: aiPrefs?.maxRecommendations,
      maxPyramidNotes: aiPrefs?.maxPyramidNotes,
      tone: aiPrefs?.tone ?? undefined,
      depth: aiPrefs?.depth ?? undefined,
      profileContext: {
        archetype: profile.archetype ?? undefined,
        favoriteNote: profile.favoriteNote ?? undefined,
        preferences: profile.preferences || undefined,
        radar:
          profile.radarAxes.length > 0
            ? Object.fromEntries(profile.radarAxes.map(({ key, value }) => [key, value]))
            : undefined,
        gender: (profile.gender as 'male' | 'female' | null | undefined) ?? undefined,
        noteRelationships: profile.noteRelationships.length > 0 ? profile.noteRelationships : undefined,
      },
      likedEntries,
      neutralEntries,
      dislikedEntries,
      ownedEntries,
    }

    await runSync(jobId, syncContext, total, hasPreferences)
  } catch (error_) {
    await failJob(jobId, error_ instanceof Error ? error_.message : 'Unknown error')
  }
}
