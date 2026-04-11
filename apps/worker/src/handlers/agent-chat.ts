import {
  analyzePreferences,
  appendPatchAuditLog,
  applyProfileAndSuggestions,
  applyRecommendations,
  applySingleTableOp,
  completeJob,
  createChatMessage,
  createPendingPatch,
  failJob,
  generateMissingTranslations,
  getUserDefaultProvider,
  isCriticalPatch,
  loadDiaryForUser,
  loadProfileForUser,
  loadRecentChatMessages,
  pushJobProgress,
  recordActivity,
  sanitizePatchToRecommendationsOnly,
  updatePatchStatus,
  warnIfPatchViolatesDisplayLimits,
} from '@oryxel/ai'
import { db, user, userAiPreferences } from '@oryxel/db'
import { eq } from 'drizzle-orm'

import type { StructuredPreferencePatch } from '@oryxel/ai'

async function applyPatchWithProgress(
  jobId: number,
  userId: string,
  patch: StructuredPreferencePatch,
  baseStep: number,
  total: number,
): Promise<boolean> {
  const profileStep = patch.profile != null || patch.suggestions != null ? 1 : 0
  const recStep = patch.recommendations == null ? 0 : 1
  let step = baseStep

  try {
    if (profileStep) {
      await pushJobProgress(jobId, { step: ++step, total, phase: 'applying' })
      await applyProfileAndSuggestions(userId, patch)
    }

    // Apply tableOps FIRST so that user interactions with recommendations
    // (e.g. op=move marking a rec as disliked) are committed before
    // applyRecommendations deletes isRecommendation=true,isTried=false rows.
    for (const op of patch.tableOps) {
      await pushJobProgress(jobId, { step: ++step, total, phase: 'applying' })
      await applySingleTableOp(userId, op)
    }

    if (recStep) {
      await pushJobProgress(jobId, { step: ++step, total, phase: 'applying' })
      await applyRecommendations(userId, patch)
    }

    return true
  } catch {
    return false
  }
}

async function applyNonCriticalPatchFlow(
  jobId: number,
  userId: string,
  patch: StructuredPreferencePatch,
  pendingPatchId: number,
  applyTotal: number,
  locale: string,
  routerAttempts: unknown,
  explicitProvider: string | undefined,
  defaultProvider: string | null | undefined,
): Promise<boolean> {
  const ok = await applyPatchWithProgress(jobId, userId, patch, 0, applyTotal)

  if (!ok) {
    await updatePatchStatus({
      patchId: pendingPatchId,
      userId,
      action: 'failed',
      failureReason: 'Patch apply failed',
    })
    await appendPatchAuditLog({
      userId,
      patchId: pendingPatchId,
      action: 'apply_failed',
      details: { attempts: routerAttempts },
    })
    await failJob(jobId, 'Patch apply failed')

    return false
  }

  void generateMissingTranslations(userId, locale)
  await updatePatchStatus({ patchId: pendingPatchId, userId, action: 'applied' })
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
type RecentChatSlice = Awaited<ReturnType<typeof loadRecentChatMessages>>

function buildPreferenceAnalysisContext(
  profile: LoadedProfile,
  diary: LoadedDiary,
  budget: string | undefined,
  rememberContext: boolean | undefined,
  recentMessages: RecentChatSlice,
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
    },
    budget,
    recentMessages: (rememberContext ?? true) ? recentMessages : undefined,
  }
}

export async function handleAgentChat(jobId: number, userId: string, params: Record<string, unknown>): Promise<void> {
  const message = params['message'] as string
  const locale = (params['locale'] as string | undefined) ?? 'en'
  const scenario = (params['scenario'] as string | undefined) ?? 'recommendation'
  const explicitProvider = params['provider'] as string | undefined
  const budget = params['budget'] as string | undefined
  const recommendationsOnly = params['recommendationsOnly'] === true

  try {
    await pushJobProgress(jobId, { step: 0, total: 1, phase: 'analyzing' })

    const userRow = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .then((r) => r[0])
    const userName = userRow?.name ?? 'User'

    const [profile, diary, defaultProvider, recentMessages, aiPrefs] = await Promise.all([
      loadProfileForUser(userId, userName),
      loadDiaryForUser(userId, locale),
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
    ])

    const context = buildPreferenceAnalysisContext(profile, diary, budget, aiPrefs?.rememberContext, recentMessages)

    const preferredProvider =
      explicitProvider === undefined
        ? (defaultProvider ?? undefined)
        : (explicitProvider as Parameters<typeof analyzePreferences>[0]['preferredProvider'])

    const router = await analyzePreferences({
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
      recommendationsOnly: recommendationsOnly || undefined,
    })

    let patch: StructuredPreferencePatch = { ...router.result.patch }

    if (recommendationsOnly) {
      patch = sanitizePatchToRecommendationsOnly(patch)
    } else {
      delete patch.agentMemoryOps
    }

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
    const critical = isCriticalPatch(patch)
    const pendingPatch = await createPendingPatch({
      userId,
      patch,
      patchType: critical ? 'critical' : 'minor',
      attempts: router.attempts as unknown as Record<string, unknown>[],
    })

    const profileStep = patch.profile != null || patch.suggestions != null ? 1 : 0
    const recStep = patch.recommendations == null ? 0 : 1
    const applyTotal = profileStep + recStep + patch.tableOps.length

    if (!critical) {
      const continued = await applyNonCriticalPatchFlow(
        jobId,
        userId,
        patch,
        pendingPatch.id,
        applyTotal,
        locale,
        router.attempts,
        explicitProvider,
        defaultProvider,
      )

      if (!continued) return
    }

    const assistantMessage =
      patch.reply ?? (critical ? `CRITICAL_PENDING:${patch.summary}` : `PATCH_APPLIED:${patch.summary}`)

    await createChatMessage({
      userId,
      role: 'assistant',
      content: assistantMessage,
      locale,
      scenario: scenario as 'analog' | 'pyramid' | 'recommendation' | 'comparison' | 'command',
    })

    const triggerSync =
      !critical &&
      !recommendationsOnly &&
      (patch.tableOps.length >= 2 || patch.recommendations != null || scenario === 'command')

    await completeJob(jobId, {
      requiresConfirmation: critical,
      pendingPatchId: pendingPatch.id,
      summary: patch.summary,
      reply: patch.reply,
      triggerSync,
      appliedPatch: structuredClone(patch) as Record<string, unknown>,
    })
  } catch (error_) {
    await failJob(jobId, error_ instanceof Error ? error_.message : 'Unknown error')
  }
}
