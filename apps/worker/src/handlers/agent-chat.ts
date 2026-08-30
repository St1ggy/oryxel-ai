import {
  JobLeaseLostError,
  analyzePreferences,
  applyPendingPatch,
  assertJobLease,
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

import type {
  AiProviderName,
  AnalyzePreferencesRequest,
  ChatAgentMode,
  JobLease,
  JobProgressMeta,
  StructuredPreferencePatch,
} from '@oryxel/ai/server'

const PRE_APPLY_STEP_COUNT = 5

async function pushJobProgressBestEffort(job: JobLease, event: Parameters<typeof pushJobProgress>[1]) {
  try {
    await pushJobProgress(job, event)
  } catch (error) {
    if (error instanceof JobLeaseLostError) throw error

    // Progress telemetry must not change the outcome of an atomic patch apply.
  }
}

async function applyNonCriticalPatchFlow(
  job: JobLease,
  userId: string,
  patch: StructuredPreferencePatch,
  pendingPatchId: number,
  totalSteps: number,
  locale: string,
  explicitProvider: string | undefined,
  defaultProvider: string | null | undefined,
) {
  const startedAt = Date.now()

  await pushJobProgressBestEffort(job, {
    step: PRE_APPLY_STEP_COUNT + 1,
    total: totalSteps,
    phase: 'applying',
  })

  let isOk = false

  try {
    await assertJobLease(job)
    const result = await applyPendingPatch({ patchId: pendingPatchId, userId, expectedStatus: 'created' })

    isOk = result.status === 'applied'
  } catch {
    isOk = false
  }

  if (!isOk) {
    await failJob(job, 'Patch apply failed')

    return false
  }

  await pushJobProgressBestEffort(job, {
    step: totalSteps,
    total: totalSteps,
    phase: 'applying',
    meta: { durationMs: Date.now() - startedAt, note: 'done' },
  })

  await generateMissingTranslations(userId, locale)
  void recordActivity({
    userId,
    action: 'patch_applied',
    actor: 'agent',
    provider: explicitProvider ?? defaultProvider ?? undefined,
    summary: patch.summary ?? '',
  }).catch(() => null)

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
  job: JobLease
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
    job,
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
      minPyramidNotes: aiPrefs?.minPyramidNotes ?? undefined,
      maxPyramidNotes: aiPrefs?.maxPyramidNotes ?? undefined,
      minRecommendations: aiPrefs?.minRecommendations ?? undefined,
      maxRecommendations: aiPrefs?.maxRecommendations ?? undefined,
    },
  })
  await assertJobLease(job)
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
      job,
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

  await assertJobLease(job)
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

  await completeJob(job, {
    requiresConfirmation: isCritical,
    pendingPatchId: pendingPatch.id,
    summary: patch.summary,
    reply: patch.reply,
    triggerSync: isTriggerSync,
    modeMismatch,
    appliedPatch: structuredClone(patch) as Record<string, unknown>,
  })
}

export async function handleAgentChat(job: JobLease, userId: string, params: Record<string, unknown>) {
  const message = params['message'] as string
  const locale = normalizeLocale((params['locale'] as string | undefined) ?? 'en')
  const scenario = ((params['scenario'] as string | undefined) ??
    'recommendation') as AnalyzePreferencesRequest['scenario']
  const explicitProvider = params['provider'] as string | undefined
  const explicitModel = params['model'] as string | undefined
  const budget = params['budget'] as string | undefined
  const isRecommendationsOnly = params['recommendationsOnly'] === true
  const chatMode = ((params['chatMode'] as string | undefined) ??
    (isRecommendationsOnly ? 'recommend' : 'agent')) as ChatAgentMode

  try {
    await pushJobProgress(job, {
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

    await pushJobProgress(job, {
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

    const preferredProvider: AnalyzePreferencesRequest['preferredProvider'] =
      explicitProvider === undefined ? (defaultProvider ?? undefined) : (explicitProvider as AiProviderName)

    await pushJobProgress(job, {
      step: 3,
      total: PRE_APPLY_STEP_COUNT,
      phase: 'build_prompt',
      meta: { scenario },
    })
    await pushJobProgress(job, {
      step: 4,
      total: PRE_APPLY_STEP_COUNT,
      phase: 'model_call',
      meta: { provider: preferredProvider } satisfies JobProgressMeta,
    })

    const callStartedAt = Date.now()
    const router = await analyzePreferences(
      {
        userId,
        message,
        locale,
        scenario,
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
          void pushPartialResult(job, partial).catch(() => null)
        },
        onTokenProgress: ({ tokensOut, durationMs }) => {
          void pushJobProgress(job, {
            step: 4,
            total: PRE_APPLY_STEP_COUNT,
            phase: 'model_call',
            meta: {
              provider: preferredProvider,
              tokensOut,
              durationMs,
            },
          }).catch(() => null)
        },
      },
    )

    await pushJobProgress(job, {
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
      job,
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
    await failJob(job, error_ instanceof Error ? error_.message : 'Unknown error')
  }
}
