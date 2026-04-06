import { redirect } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'

import { DIARY_LIST_TAB_VALUES } from '$lib/diary/diary-tab-items'
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

async function applyConfirmedPatches(userId: string): Promise<void> {
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

  // Auto-apply patches confirmed by user but not yet applied (must finish before diary loads)
  await applyConfirmedPatches(userId)

  // Slow queries — returned as un-awaited Promises so SvelteKit streams them to the client
  const diary = loadDiaryForUser(userId, locale)
  const profile = loadProfileForUser(userId, locals.user.name || 'User', locale)
  const recentActivity = loadRecentActivity(userId, 30)

  // Fast queries — resolved before the shell renders
  const [pendingPatches, activeJobs, configuredProviders, providerRows, defaultProvider, prefsRows, profileRows] =
    await Promise.all([
      getLatestPendingPatches(userId, 3),
      getActiveJobsForUser(userId),
      listConfiguredProviders(userId),
      listUserProviderKeys(userId),
      getUserDefaultProvider(userId),
      db
        .select({ graphStyle: userAiPreferences.graphStyle })
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
  const onboardingCompleted = !!profileRows[0]?.onboardingCompletedAt

  const labelMap = new Map(providerRows.map((r) => [r.provider, r.label]))
  const chatProviders = configuredProviders.map((p, index) => ({
    value: p.id,
    label: labelMap.get(p.id) ?? PROVIDER_DISPLAY_NAME[p.id],
    active: defaultProvider ? p.id === defaultProvider : index === 0,
    source: p.source === 'env' ? ('user' as const) : p.source,
  }))
  const hasChatAccess = await hasEffectiveProviderAccess(userId)
  const latestChatRows = await listLatestChatMessages(userId, 40)
  const chatHistory = [...latestChatRows]
    .reverse()
    .map((row) => ({ id: `db-${row.id}`, role: row.role as 'user' | 'assistant', content: row.content }))

  const rawTab = url.searchParams.get('tab') ?? ''
  const initialTab = (DIARY_LIST_TAB_VALUES as readonly string[]).includes(rawTab)
    ? (rawTab as (typeof DIARY_LIST_TAB_VALUES)[number])
    : 'owned'

  return {
    diary,
    userId,
    profile,
    pendingPatches,
    recentActivity,
    activeJobs,
    locale,
    hasChatAccess,
    chatProviders,
    chatHistory,
    initialTab,
    graphStyle,
    onboardingCompleted,
  }
}
