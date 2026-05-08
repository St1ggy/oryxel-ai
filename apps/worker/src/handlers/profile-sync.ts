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

import type { AnalyzePreferencesRequest, DiaryRow } from '@oryxel/ai'

const BATCH_SIZE = 10

type DiaryEntry = { id: number; brand: string; fragrance: string }
type SyncPhase = 'owned' | 'liked' | 'neutral' | 'disliked' | 'profile' | 'recommendations' | 'to_try'
type FillPhase = Exclude<SyncPhase, 'profile' | 'recommendations'>

type StepContext = {
  userId: string
  userName: string
  locale: string
  provider: AnalyzePreferencesRequest['preferredProvider']
  minRecommendations: number | undefined
  maxRecommendations: number | undefined
  minPyramidNotes: number | undefined
  maxPyramidNotes: number | undefined
  tone: string | undefined
  depth: string | undefined
  profileContext: NonNullable<AnalyzePreferencesRequest['context']>['profile']
  // Full lists (id+brand+fragrance only) used as analysis context for profile/recommendations.
  ownedEntries: DiaryEntry[]
  likedEntries: DiaryEntry[]
  neutralEntries: DiaryEntry[]
  dislikedEntries: DiaryEntry[]
  toTryEntries: DiaryEntry[]
  // Subsets of the lists above whose rows still have at least one missing metadata field.
  // Only these go into fillListBatches — already-enriched rows are skipped to save AI calls.
  ownedPending: DiaryEntry[]
  likedPending: DiaryEntry[]
  neutralPending: DiaryEntry[]
  dislikedPending: DiaryEntry[]
  toTryPending: DiaryEntry[]
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

/** Row needs an AI fill pass if any of the visible-in-UI metadata fields is empty. */
function needsEnrichment(row: DiaryRow): boolean {
  return (
    row.notes.length === 0 ||
    !row.pyramidTop ||
    !row.pyramidMid ||
    !row.pyramidBase ||
    !row.agentComment ||
    !row.season ||
    !row.timeOfDay ||
    !row.gender
  )
}

function toEntry({ id, brand, fragrance }: DiaryRow): DiaryEntry {
  return { id, brand, fragrance }
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- chain of progress emits + try/catch hits the threshold; readability > splitting
async function fillListBatches(
  jobId: number,
  context: StepContext,
  entries: DiaryEntry[],
  phase: FillPhase,
  startStep: number,
  total: number,
): Promise<void> {
  const batches = chunk(entries, BATCH_SIZE)

  for (const [index, batch] of batches.entries()) {
    const startedAt = Date.now()

    await pushJobProgress(jobId, {
      step: startStep + index,
      total,
      phase,
      meta: { provider: context.provider, note: `batch ${index + 1}/${batches.length}` },
    })

    try {
      const batchRouter = await analyzePreferences({
        userId: context.userId,
        message: FILL_BATCH_MSG,
        locale: context.locale,
        scenario: 'command',
        preferredProvider: context.provider,
        minPyramidNotes: context.minPyramidNotes,
        maxPyramidNotes: context.maxPyramidNotes,
        tone: context.tone,
        depth: context.depth,
        context: {
          profile: context.profileContext,
          diary: {
            to_try: phase === 'to_try' ? batch : [],
            liked: phase === 'liked' ? batch : [],
            neutral: phase === 'neutral' ? batch : [],
            disliked: phase === 'disliked' ? batch : [],
            owned: phase === 'owned' ? batch : [],
          },
        },
      })

      await applyPatchToDatabase(context.userId, batchRouter.result.patch)

      await pushJobProgress(jobId, {
        step: startStep + index,
        total,
        phase,
        meta: {
          provider: batchRouter.result.provider,
          model: batchRouter.result.model,
          durationMs: Date.now() - startedAt,
          note: `batch ${index + 1}/${batches.length}:done`,
        },
      })
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
      minPyramidNotes: context.minPyramidNotes,
      maxPyramidNotes: context.maxPyramidNotes,
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

type FillPhaseConfig = { phase: FillPhase; entries: DiaryEntry[] }

async function runFillPhases(
  jobId: number,
  context: StepContext,
  phases: FillPhaseConfig[],
  total: number,
  startStep: number,
): Promise<number> {
  let step = startStep

  for (const { phase, entries } of phases) {
    if (entries.length === 0) continue

    await fillListBatches(jobId, context, entries, phase, step, total)
    step += chunk(entries, BATCH_SIZE).length
  }

  return step
}

async function runSync(jobId: number, context: StepContext, total: number, hasPreferences: boolean): Promise<void> {
  let step = await runFillPhases(
    jobId,
    context,
    [
      { phase: 'owned', entries: context.ownedPending },
      { phase: 'liked', entries: context.likedPending },
      { phase: 'neutral', entries: context.neutralPending },
      { phase: 'disliked', entries: context.dislikedPending },
      { phase: 'to_try', entries: context.toTryPending },
    ],
    total,
    1,
  )

  const profileStartedAt = Date.now()

  await pushJobProgress(jobId, { step, total, phase: 'profile', meta: { provider: context.provider } })
  await runProfileStep(context)
  await pushJobProgress(jobId, {
    step,
    total,
    phase: 'profile',
    meta: { provider: context.provider, durationMs: Date.now() - profileStartedAt, note: 'done' },
  })
  step++

  if (hasPreferences) {
    const recStartedAt = Date.now()

    await pushJobProgress(jobId, { step, total, phase: 'recommendations', meta: { provider: context.provider } })
    await runRecommendationsStep(context)
    await pushJobProgress(jobId, {
      step,
      total,
      phase: 'recommendations',
      meta: { provider: context.provider, durationMs: Date.now() - recStartedAt, note: 'done' },
    })
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
          minPyramidNotes: userAiPreferences.minPyramidNotes,
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

    const ownedEntries = diary.owned.map((row) => toEntry(row))
    const likedEntries = diary.liked.map((row) => toEntry(row))
    const neutralEntries = diary.neutral.map((row) => toEntry(row))
    const dislikedEntries = diary.disliked.map((row) => toEntry(row))
    const toTryEntries = diary.to_try.map((row) => toEntry(row))

    const ownedPending = diary.owned.filter((row) => needsEnrichment(row)).map((row) => toEntry(row))
    const likedPending = diary.liked.filter((row) => needsEnrichment(row)).map((row) => toEntry(row))
    const neutralPending = diary.neutral.filter((row) => needsEnrichment(row)).map((row) => toEntry(row))
    const dislikedPending = diary.disliked.filter((row) => needsEnrichment(row)).map((row) => toEntry(row))
    const toTryPending = diary.to_try.filter((row) => needsEnrichment(row)).map((row) => toEntry(row))

    const ownedBatches = chunk(ownedPending, BATCH_SIZE).length
    const likedBatches = chunk(likedPending, BATCH_SIZE).length
    const neutralBatches = chunk(neutralPending, BATCH_SIZE).length
    const dislikedBatches = chunk(dislikedPending, BATCH_SIZE).length
    const toTryBatches = chunk(toTryPending, BATCH_SIZE).length

    const hasPreferences =
      ownedEntries.length + likedEntries.length + neutralEntries.length + dislikedEntries.length > 0
    const total =
      ownedBatches +
      likedBatches +
      neutralBatches +
      dislikedBatches +
      toTryBatches +
      1 /* profile */ +
      (hasPreferences ? 1 : 0) /* recommendations */

    const syncContext: StepContext = {
      userId,
      userName,
      locale,
      provider: defaultProvider ?? undefined,
      minRecommendations: aiPrefs?.minRecommendations,
      maxRecommendations: aiPrefs?.maxRecommendations,
      minPyramidNotes: aiPrefs?.minPyramidNotes,
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
      ownedEntries,
      likedEntries,
      neutralEntries,
      dislikedEntries,
      toTryEntries,
      ownedPending,
      likedPending,
      neutralPending,
      dislikedPending,
      toTryPending,
    }

    await runSync(jobId, syncContext, total, hasPreferences)
  } catch (error_) {
    await failJob(jobId, error_ instanceof Error ? error_.message : 'Unknown error')
  }
}
