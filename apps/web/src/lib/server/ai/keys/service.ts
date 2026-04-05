import { and, desc, eq } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { userAiPreferences, userAiProviderKey } from '$lib/server/db/schema'

import { decryptSecret } from '../crypto/secret-box'

import { fallbackProviderKey, getPlatformKeyConfig, hasAnyFallbackKey } from './env-keys'
import {
  ALL_PROVIDERS,
  type ConfiguredProvider,
  type ProviderApiKeyCandidate,
  type ProviderId,
  assertProvider,
} from './types'

export type { ConfiguredProvider, ProviderId, ProviderApiKeyCandidate, ProviderKeyListItem } from './types'
export { ALL_PROVIDERS } from './types'
export {
  deleteUserProviderKey,
  importLegacyProviderKeys,
  listUserProviderKeys,
  setDefaultUserProviderKey,
  upsertUserProviderKey,
} from './crud'
export { PROVIDER_DISPLAY_NAME } from '$lib/ai/provider-guides'

export async function resolveProviderApiKey(userId: string, provider: ProviderId): Promise<string | null> {
  const [first] = await listProviderApiKeyCandidates(userId, provider, 1)

  return first?.key ?? null
}

export async function listProviderApiKeyCandidates(
  userId: string,
  provider: ProviderId,
  limit = 10,
): Promise<ProviderApiKeyCandidate[]> {
  const rows = await db
    .select()
    .from(userAiProviderKey)
    .where(and(eq(userAiProviderKey.userId, userId), eq(userAiProviderKey.provider, provider)))
    .orderBy(desc(userAiProviderKey.isDefault), desc(userAiProviderKey.updatedAt))
    .limit(limit)

  const candidates: ProviderApiKeyCandidate[] = rows.map((row) => ({
    key: decryptSecret({
      encryptedKey: row.encryptedKey,
      keyIv: row.keyIv,
      keyAuthTag: row.keyAuthTag,
      keyVersion: row.keyVersion,
    }),
    source: 'user' as const,
    keyId: row.id,
    label: row.label,
    isDefault: row.isDefault,
  }))

  const fallbackKey = fallbackProviderKey(provider)?.trim()

  if (fallbackKey) {
    candidates.push({ key: fallbackKey, source: 'env', keyId: null, label: `${provider}-env`, isDefault: false })
  }

  const platformConfig = getPlatformKeyConfig()

  if (platformConfig && platformConfig.provider === provider) {
    candidates.push({ key: platformConfig.key, source: 'platform', keyId: null, label: 'platform', isDefault: false })
  }

  return candidates
}

export async function getUserDefaultProvider(userId: string): Promise<ProviderId | null> {
  const [row] = await db.select().from(userAiPreferences).where(eq(userAiPreferences.userId, userId)).limit(1)

  if (!row?.defaultProvider) return null

  try {
    assertProvider(row.defaultProvider)

    return row.defaultProvider
  } catch {
    return null
  }
}

export async function setUserDefaultProvider(userId: string, provider: string): Promise<void> {
  assertProvider(provider)
  await db
    .insert(userAiPreferences)
    .values({ userId, defaultProvider: provider })
    .onConflictDoUpdate({ target: userAiPreferences.userId, set: { defaultProvider: provider } })
}

export async function listConfiguredProviders(userId: string): Promise<ConfiguredProvider[]> {
  const results = await Promise.all(
    ALL_PROVIDERS.map(async (p) => {
      const [first] = await listProviderApiKeyCandidates(userId, p, 1)

      return first ? { id: p, source: first.source } : null
    }),
  )

  return results.filter((p): p is ConfiguredProvider => p !== null)
}

export async function listConfiguredProviderIds(userId: string): Promise<ProviderId[]> {
  const configured = await listConfiguredProviders(userId)

  return configured.map((p) => p.id)
}

export async function hasEffectiveProviderAccess(userId: string): Promise<boolean> {
  const [hasUserKeys] = await db
    .select({ id: userAiProviderKey.id })
    .from(userAiProviderKey)
    .where(eq(userAiProviderKey.userId, userId))
    .limit(1)

  if (hasUserKeys || hasAnyFallbackKey()) return true

  return Boolean(getPlatformKeyConfig())
}

export async function grantPlatformAccess(userId: string): Promise<void> {
  await db
    .insert(userAiPreferences)
    .values({ userId, platformAccess: true })
    .onConflictDoUpdate({ target: userAiPreferences.userId, set: { platformAccess: true } })
}

export async function revokePlatformAccess(userId: string): Promise<void> {
  await db.update(userAiPreferences).set({ platformAccess: false }).where(eq(userAiPreferences.userId, userId))
}
