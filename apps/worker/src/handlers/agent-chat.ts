import {
  analyzePreferences,
  applyPendingPatch,
  completeJob,
  countStrippedPatchMutations,
  createChatMessage,
  createPendingPatch,
  failJob,
  generateMissingTranslations,
  getUserDefaultProvider,
  inferSuggestedChatMode,
  isCriticalPatch,
  listListsForUser,
  loadDiaryForUser,
  loadDismissedForUser,
  loadProfileForUser,
  loadRecentChatMessages,
  normalizeLocale,
  pushJobProgress,
  pushPartialResult,
  recordActivity,
  sanitizePatchForChatMode,
  sanitizePatchToRecommendationsOnly,
  warnIfPatchViolatesDisplayLimits,
} from '@oryxel/ai/server'
import { db, user, userAiPreferences } from '@oryxel/db'
import { eq } from 'drizzle-orm'

import type { ChatAgentMode, StructuredPreferencePatch } from '@oryxel/ai/server'

const PRE_APPLY_STEP_COUNT = 5

async function pushJobProgressBestEffort(jobId: number, event: Parameters<typeof pushJobProgress>[1]) {
  try {
    await pushJobProgress(jobId, event)
  } catch {
    // Progress telemetry must not change the outcome of an atomic patch apply.
  }
}

async function applyNonCriticalPatchFlow(
  jobId: number,
  userId: string,
  patch: StructuredPreferencePatch,
  pendingPatchId: number,
  totalSteps: number,
  locale: string,
  explicitProvider: string | undefined,
  defaultProvider: string | null | undefined,
) {
  const startedAt = Date.now()

  await pushJobProgressBestEffort(jobId, {
    step: PRE_APPLY_STEP_COUNT + 1,
    total: totalSteps,
    phase: 'applying',
  })

  let isOk = false

  try {
    const result = await applyPendingPatch({ patchId: pendingPatchId, userId, expectedStatus: 'created' })

    isOk = result.status === 'applied'
  } catch {
    isOk = false
  }

  if (!isOk) {
    await failJob(jobId, 'Patch apply failed')

    return false
  }

  await pushJobProgressBestEffort(jobId, {
    step: totalSteps,
    total: totalSteps,
    phase: 'applying',
    meta: { durationMs: Date.now() - startedAt, note: 'done' },
  })

  void generateMissingTranslations(userId, locale)
  void recordActivity({
    userId,
    action: 'patch_applied',
    actor: 'agent',
    provider: explicitProvider ?? defaultProvider ?? undefined,
    summary: patch.summary ?? '',
  })

  return true
}

type LoadedProfile = Awaited<ReturnType<typeof loadProfileForUser>>
type LoadedDiary = Awaited<ReturnType<typeof loadDiaryForUser>>
type LoadedDismissed = Awaited<ReturnType<typeof loadDismissedForUser>>
type RecentChatSlice = Awaited<ReturnType<typeof loadRecentChatMessages>>

function buildPreferenceAnalysisContext(
  profile: LoadedProfile,
  diary: LoadedDiary,
  dismissed: LoadedDismissed,
  budget: string | undefined,
  rememberContext: boolean | undefined,
  recentMessages: RecentChatSlice,
  lists: Awaited<ReturnType<typeof listListsForUser>>,
) {
  type DiaryEntry = (typeof diary.to_try)[number]

  const toContextEntry = ({ id, brand, fragrance, notes, pyramidTop, pyramidMid, pyramidBase }: DiaryEntry) => ({
    id,
    brand,
    fragrance,
    notes: notes.join(', ') || null,
    pyramidTop,
    pyramidMid,
    pyramidBase,
  })

  const toContextEntryWithRating = (entry: DiaryEntry) => ({
    ...toContextEntry(entry),
    rating: entry.rating || null,
  })

  return {
    profile: {
      displayName: profile.displayName,
      bio: profile.bio,
      preferences: profile.preferences || undefined,
      archetype: profile.archetype ?? undefined,
      favoriteNote: profile.favoriteNote ?? undefined,
      radar: Object.fromEntries(profile.radarAxes.map(({ key, value }) => [key, value])),
      gender: (profile.gender as 'male' | 'female' | null | undefined) ?? undefined,
      noteRelationships: profile.noteRelationships.length > 0 ? profile.noteRelationships : undefined,
    },
    diary: {
      to_try: diary.to_try.map((entry) => toContextEntry(entry)),
      liked: diary.liked.map((entry) => toContextEntryWithRating(entry)),
      neutral: diary.neutral.map((entry) => toContextEntry(entry)),
      disliked: diary.disliked.map((entry) => toContextEntry(entry)),
      owned: diary.owned.map((entry) => toContextEntryWithRating(entry)),
      dismissed,
    },
    budget,
    recentMessages: (rememberContext ?? true) ? recentMessages : undefined,
    lists:
      lists.length > 0
        ? lists.map((list) => ({
            id: list.id,
            slug: list.slug,
            title: list.title,
            kind: list.kind,
            visibility: list.visibility,
          }))
        : undefined,
  }
}

function sanitizeAgentChatPatch(
  patch: StructuredPreferencePatch,
  recommendationsOnly: boolean,
  chatMode: ChatAgentMode,
) {
  if (recommendationsOnly || chatMode === 'recommend') {
    return sanitizePatchToRecommendationsOnly(patch)
  }

  const sanitized = sanitizePatchForChatMode(patch, chatMode)

  delete sanitized.agentMemoryOps

  return sanitized
}

function assistantFallbackMessage(patch: StructuredPreferencePatch, critical: boolean, chatMode: ChatAgentMode) {
  if (critical) {
    return `CRITICAL_PENDING:${patch.summary}`
  }

  if (chatMode === 'ask') {
    return patch.summary
  }

  if (chatMode === 'curate') {
    return patch.reply ?? patch.summary
  }

  return `PATCH_APPLIED:${patch.summary}`
}

type AgentChatFinishInput = {
  jobId: number
  userId: string
  message: string
  locale: string
  scenario: string
  chatMode: ChatAgentMode
  recommendationsOnly: boolean
  router: Awaited<ReturnType<typeof analyzePreferences>>
  explicitProvider: string | undefined
  defaultProvider: string | null | undefined
  aiPrefs:
    | {
        minPyramidNotes: number | null
        maxPyramidNotes: number | null
        minRecommendations: number | null
        maxRecommendations: number | null
      }
    | undefined
}

async function finishAgentChatFromPatch(input: AgentChatFinishInput) {
  const {
    jobId,
    userId,
    message,
    locale,
    scenario,
    chatMode,
    recommendationsOnly,
    router,
    explicitProvider,
    defaultProvider,
    aiPrefs,
  } = input

  let patch: StructuredPreferencePatch = { ...router.result.patch }
  const rawPatch = structuredClone(patch) as StructuredPreferencePatch

  patch = sanitizeAgentChatPatch(patch, recommendationsOnly, chatMode)

  const strippedOps = countStrippedPatchMutations(rawPatch, patch)
  const suggestedMode = strippedOps > 0 ? inferSuggestedChatMode(message) : null
  const modeMismatch =
    strippedOps > 0 && suggestedMode && suggestedMode !== chatMode
      ? { suggested: suggestedMode, strippedOps }
      : undefined

  warnIfPatchViolatesDisplayLimits(patch, {
    scenario,
    userId,
    limits: {
      minPyramidNotes: aiPrefs?.minPyramidNotes,
      maxPyramidNotes: aiPrefs?.maxPyramidNotes,
      minRecommendations: aiPrefs?.minRecommendations,
      maxRecommendations: aiPrefs?.maxRecommendations,
    },
  })
  const isCritical = isCriticalPatch(patch)
  const pendingPatch = await createPendingPatch({
    userId,
    patch,
    patchType: isCritical ? 'critical' : 'minor',
    attempts: router.attempts as unknown as Record<string, unknown>[],
  })

  const totalSteps = PRE_APPLY_STEP_COUNT + 1

  const isSkipApply = chatMode === 'ask' || isCritical

  if (!isSkipApply) {
    const isContinued = await applyNonCriticalPatchFlow(
      jobId,
      userId,
      patch,
      pendingPatch.id,
      totalSteps,
      locale,
      explicitProvider,
      defaultProvider,
    )

    if (!isContinued) return
  }

  const assistantMessage = patch.reply ?? assistantFallbackMessage(patch, isCritical, chatMode)

  await createChatMessage({
    userId,
    role: 'assistant',
    content: assistantMessage,
    locale,
    scenario: scenario as 'analog' | 'pyramid' | 'recommendation' | 'comparison' | 'command',
  })

  const isTriggerSync =
    !isCritical &&
    chatMode !== 'ask' &&
    !recommendationsOnly &&
    chatMode !== 'recommend' &&
    (patch.tableOps.length >= 2 || patch.recommendations != null || scenario === 'command')

  await completeJob(jobId, {
    requiresConfirmation: isCritical,
    pendingPatchId: pendingPatch.id,
    summary: patch.summary,
    reply: patch.reply,
    triggerSync: isTriggerSync,
    modeMismatch,
    appliedPatch: structuredClone(patch) as Record<string, unknown>,
  })
}

export async function handleAgentChat(jobId: number, userId: string, params: Record<string, unknown>) {
  const message = params['message'] as string
  const locale = normalizeLocale((params['locale'] as string | undefined) ?? 'en')
  const scenario = (params['scenario'] as string | undefined) ?? 'recommendation'
  const explicitProvider = params['provider'] as string | undefined
  const explicitModel = params['model'] as string | undefined
  const budget = params['budget'] as string | undefined
  const isRecommendationsOnly = params['recommendationsOnly'] === true
  const chatMode = ((params['chatMode'] as string | undefined) ??
    (isRecommendationsOnly ? 'recommend' : 'agent')) as ChatAgentMode

  try {
    await pushJobProgress(jobId, {
      step: 1,
      total: PRE_APPLY_STEP_COUNT,
      phase: 'validate',
      meta: { scenario, chatMode },
    })

    const userRow = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .then((r) => r[0])
    const userName = userRow?.name ?? 'User'

    const contextStartedAt = Date.now()
    const [profile, diary, dismissed, defaultProvider, recentMessages, aiPrefs, lists] = await Promise.all([
      loadProfileForUser(userId, userName),
      loadDiaryForUser(userId, locale),
      loadDismissedForUser(userId),
      getUserDefaultProvider(userId),
      loadRecentChatMessages(userId, 6),
      db
        .select({
          minRecommendations: userAiPreferences.minRecommendations,
          maxRecommendations: userAiPreferences.maxRecommendations,
          minPyramidNotes: userAiPreferences.minPyramidNotes,
          maxPyramidNotes: userAiPreferences.maxPyramidNotes,
          tone: userAiPreferences.tone,
          depth: userAiPreferences.depth,
          rememberContext: userAiPreferences.rememberContext,
          systemPromptMode: userAiPreferences.systemPromptMode,
          systemPromptAppend: userAiPreferences.systemPromptAppend,
          systemPromptReplace: userAiPreferences.systemPromptReplace,
        })
        .from(userAiPreferences)
        .where(eq(userAiPreferences.userId, userId))
        .limit(1)
        .then((rows) => rows[0]),
      listListsForUser(userId),
    ])

    await pushJobProgress(jobId, {
      step: 2,
      total: PRE_APPLY_STEP_COUNT,
      phase: 'load_context',
      meta: { durationMs: Date.now() - contextStartedAt },
    })

    const context = buildPreferenceAnalysisContext(
      profile,
      diary,
      dismissed,
      budget,
      aiPrefs?.rememberContext,
      recentMessages,
      lists,
    )

    const preferredProvider =
      explicitProvider === undefined
        ? (defaultProvider ?? undefined)
        : (explicitProvider as Parameters<typeof analyzePreferences>[0]['preferredProvider'])

    await pushJobProgress(jobId, {
      step: 3,
      total: PRE_APPLY_STEP_COUNT,
      phase: 'build_prompt',
      meta: { scenario },
    })
    await pushJobProgress(jobId, {
      step: 4,
      total: PRE_APPLY_STEP_COUNT,
      phase: 'model_call',
      meta: { provider: preferredProvider as Parameters<typeof pushJobProgress>[1]['meta']['provider'] },
    })

    const callStartedAt = Date.now()
    const router = await analyzePreferences(
      {
        userId,
        message,
        locale,
        scenario: scenario as Parameters<typeof analyzePreferences>[0]['scenario'],
        context,
        preferredProvider,
        minRecommendations: aiPrefs?.minRecommendations,
        maxRecommendations: aiPrefs?.maxRecommendations,
        minPyramidNotes: aiPrefs?.minPyramidNotes,
        maxPyramidNotes: aiPrefs?.maxPyramidNotes,
        tone: aiPrefs?.tone ?? undefined,
        depth: aiPrefs?.depth ?? undefined,
        systemPromptMode: (aiPrefs?.systemPromptMode as 'default' | 'append' | 'replace' | undefined) ?? undefined,
        systemPromptAppend: aiPrefs?.systemPromptAppend ?? undefined,
        systemPromptReplace: aiPrefs?.systemPromptReplace ?? undefined,
        allowAgentMemoryOps: false,
        recommendationsOnly: isRecommendationsOnly || chatMode === 'recommend' || undefined,
        chatMode,
        model: explicitModel,
      },
      {
        onPartial: (partial) => {
          void pushPartialResult(jobId, partial)
        },
        onTokenProgress: ({ tokensOut, durationMs }) => {
          void pushJobProgress(jobId, {
            step: 4,
            total: PRE_APPLY_STEP_COUNT,
            phase: 'model_call',
            meta: {
              provider: preferredProvider,
              tokensOut,
              durationMs,
            },
          })
        },
      },
    )

    await pushJobProgress(jobId, {
      step: 5,
      total: PRE_APPLY_STEP_COUNT,
      phase: 'parse',
      meta: {
        provider: router.result.provider,
        model: router.result.model,
        durationMs: Date.now() - callStartedAt,
        attempt: router.attempts.length,
      },
    })

    await finishAgentChatFromPatch({
      jobId,
      userId,
      message,
      locale,
      scenario,
      chatMode,
      recommendationsOnly: isRecommendationsOnly,
      router,
      explicitProvider,
      defaultProvider,
      aiPrefs,
    })
  } catch (error_) {
    await failJob(jobId, error_ instanceof Error ? error_.message : 'Unknown error')
  }
}
