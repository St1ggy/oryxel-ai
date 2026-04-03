import { redirect } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'

import { cookieName } from '$lib/paraglide/runtime'
import { applyPatchToDatabase } from '$lib/server/ai/apply'
import {
  getUserDefaultProvider,
  hasEffectiveProviderAccess,
  listConfiguredProviderIds,
  listUserProviderKeys,
} from '$lib/server/ai/keys/service'
import { getLatestPendingPatches, listLatestChatMessages, updatePatchStatus } from '$lib/server/ai/storage'
import { db } from '$lib/server/db'
import { aiPendingPatch } from '$lib/server/db/schema'
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

  const [diary, profile, pendingPatches] = await Promise.all([
    loadDiaryForUser(userId, locale),
    loadProfileForUser(userId, locals.user.name || 'User', locale),
    getLatestPendingPatches(userId, 3),
  ])

  const [configuredIds, providerRows, defaultProvider] = await Promise.all([
    listConfiguredProviderIds(userId),
    listUserProviderKeys(userId),
    getUserDefaultProvider(userId),
  ])

  const labelMap = new Map(providerRows.map((r) => [r.provider, r.label]))
  const chatProviders = configuredIds.map((id, index) => ({
    value: id,
    label: labelMap.get(id) || id,
    active: defaultProvider ? id === defaultProvider : index === 0,
  }))
  const hasChatAccess = await hasEffectiveProviderAccess(userId)
  const latestChatRows = await listLatestChatMessages(userId, 40)
  const chatHistory = latestChatRows
    .toReversed()
    .map((row) => ({ id: `db-${row.id}`, role: row.role as 'user' | 'assistant', content: row.content }))

  return { diary, userId, profile, pendingPatches, locale, hasChatAccess, chatProviders, chatHistory }
}
