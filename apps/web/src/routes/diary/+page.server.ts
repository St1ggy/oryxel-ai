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
import { aiPendingPatch } from '$lib/server/db/schema'
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

  // Auto-apply patches confirmed by user but not yet applied
  await applyConfirmedPatches(userId)

  const [diary, profile, pendingPatches, recentActivity, activeJobs] = await Promise.all([
    loadDiaryForUser(userId, locale),
    loadProfileForUser(userId, locals.user.name || 'User', locale),
    getLatestPendingPatches(userId, 3),
    loadRecentActivity(userId, 30),
    getActiveJobsForUser(userId),
  ])

  const [configuredProviders, providerRows, defaultProvider] = await Promise.all([
    listConfiguredProviders(userId),
    listUserProviderKeys(userId),
    getUserDefaultProvider(userId),
  ])

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
  }
}
