import { type AiProviderName, getModelsForProvider } from '@oryxel/ai'
import { redirect } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'

import { parseDiaryUrlParams } from '$lib/diary/diary-url'
import { cookieName } from '$lib/paraglide/runtime'
import { applyPatchToDatabase } from '$lib/server/ai/apply'
import { getActiveJobsForUser } from '$lib/server/ai/jobs'
import {
  PROVIDER_DISPLAY_NAME,
  getUserDefaultProvider,
  hasEffectiveProviderAccess,
  listConfiguredProviders,
  listUserProviderKeys,
} from '$lib/server/ai/keys/service'
import { getLatestPendingPatches, listLatestChatMessages, updatePatchStatus } from '$lib/server/ai/storage'
import { db } from '$lib/server/db'
import { aiPendingPatch, userAiPreferences, userProfile } from '$lib/server/db/schema'
import { loadRecentActivity } from '$lib/server/diary/activity'
import { loadDiaryForUser } from '$lib/server/diary/load'
import { loadProfileForUser } from '$lib/server/profile/load'

import type { PageServerLoad } from './$types'

async function applyConfirmedPatches(userId: string) {
  const confirmed = await db
    .select()
    .from(aiPendingPatch)
    .where(and(eq(aiPendingPatch.userId, userId), eq(aiPendingPatch.status, 'confirmed')))

  for (const patch of confirmed) {
    try {
      await applyPatchToDatabase(userId, patch.payload as never)
      await updatePatchStatus({ patchId: patch.id, userId, action: 'applied' })
    } catch (error) {
      await updatePatchStatus({
        patchId: patch.id,
        userId,
        action: 'failed',
        failureReason: error instanceof Error ? error.message : 'Auto-apply failed',
      })
    }
  }
}

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
  if (!locals.user) {
    throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`)
  }

  const userId = locals.user.id
  const locale = cookies.get(cookieName) ?? 'en'
  const displayName = locals.user.name || 'User'

  // Single gate: confirmed patches must run before diary / shell reads see updated DB.
  const afterPatches = applyConfirmedPatches(userId)

  const diary = afterPatches.then(() => loadDiaryForUser(userId, locale))
  const profile = afterPatches.then(() => loadProfileForUser(userId, displayName, locale))
  const recentActivity = afterPatches.then(() => loadRecentActivity(userId, 30))

  // Everything else streams after the same patch gate — load() returns immediately (no top-level await).
  const deferredShell = afterPatches.then(async () => {
    const [pendingPatches, activeJobs, configuredProviders, providerRows, defaultProvider, prefsRows, profileRows] =
      await Promise.all([
        getLatestPendingPatches(userId, 3),
        getActiveJobsForUser(userId),
        listConfiguredProviders(userId),
        listUserProviderKeys(userId),
        getUserDefaultProvider(userId),
        db
          .select({
            graphStyle: userAiPreferences.graphStyle,
            defaultChatMode: userAiPreferences.defaultChatMode,
            defaultModelId: userAiPreferences.defaultModelId,
          })
          .from(userAiPreferences)
          .where(eq(userAiPreferences.userId, userId))
          .limit(1),
        db
          .select({ onboardingCompletedAt: userProfile.onboardingCompletedAt })
          .from(userProfile)
          .where(eq(userProfile.userId, userId))
          .limit(1),
      ])

    const graphStyle = prefsRows[0]?.graphStyle ?? 'default'
    const chatMode = (prefsRows[0]?.defaultChatMode as 'ask' | 'agent' | 'add' | 'recommend' | null) ?? 'agent'
    const savedModelId = prefsRows[0]?.defaultModelId ?? null
    const onboardingCompleted = !!profileRows[0]?.onboardingCompletedAt

    const labelMap = new Map(providerRows.map((r) => [r.provider, r.label]))
    const chatProviders = configuredProviders.map((p, index) => ({
      value: p.id,
      label: labelMap.get(p.id) ?? PROVIDER_DISPLAY_NAME[p.id],
      active: defaultProvider ? p.id === defaultProvider : index === 0,
      source: p.source === 'env' ? ('user' as const) : p.source,
    }))

    const activeProviderId = (defaultProvider ?? chatProviders[0]?.value ?? 'openai') as AiProviderName
    const modelCatalog = Object.fromEntries(
      configuredProviders.map((provider) => [provider.id, getModelsForProvider(provider.id as AiProviderName)]),
    ) as Record<string, { id: string; label: string }[]>

    const hasChatAccess = await hasEffectiveProviderAccess(userId)
    const latestChatRows = await listLatestChatMessages(userId, 40)
    const chatHistory = [...latestChatRows]
      .reverse()
      .map((row) => ({ id: `db-${row.id}`, role: row.role as 'user' | 'assistant', content: row.content }))

    return {
      pendingPatches,
      activeJobs,
      chatProviders,
      chatPreferences: {
        mode: chatMode,
        provider: activeProviderId,
        modelId: savedModelId,
      },
      modelCatalog,
      hasChatAccess,
      chatHistory,
      graphStyle,
      onboardingCompleted,
    }
  })

  const { view: initialView, list: initialFragranceTab } = parseDiaryUrlParams(url.searchParams)

  return {
    diary,
    profile,
    recentActivity,
    deferredShell,
    locale,
    userId,
    initialView,
    initialFragranceTab,
  }
}
