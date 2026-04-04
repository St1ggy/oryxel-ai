import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { userAiPreferences, userAiProviderKey } from '$lib/server/db/schema'

import { decryptSecret, encryptSecret } from '../crypto/secret-box'

import { env } from '$env/dynamic/private'

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'qwen' | 'perplexity' | 'groq' | 'deepseek'

export type ProviderKeyListItem = {
  id: number
  provider: ProviderId
  label: string
  active: boolean
  keyHint: string
}

export type ProviderApiKeyCandidate = {
  key: string
  source: 'user' | 'env' | 'platform'
  keyId: number | null
  label: string
  isDefault: boolean
}

const DEFAULT_LABEL_BY_PROVIDER: Record<ProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  qwen: 'Qwen',
  perplexity: 'Perplexity',
  groq: 'Groq',
  deepseek: 'DeepSeek',
}

function getPlatformKeyConfig(): { provider: ProviderId; key: string } | null {
  const provider = env.PLATFORM_AI_PROVIDER?.trim()
  const key = env.PLATFORM_AI_KEY?.trim()

  if (!provider || !key) return null

  try {
    assertProvider(provider)

    return { provider: provider as ProviderId, key }
  } catch {
    return null
  }
}

function fallbackProviderKey(provider: ProviderId): string | undefined {
  switch (provider) {
    case 'openai': {
      return env.OPENAI_API_KEY
    }

    case 'anthropic': {
      return env.ANTHROPIC_API_KEY
    }

    case 'gemini': {
      return env.GEMINI_API_KEY
    }

    case 'qwen': {
      return env.QWEN_API_KEY
    }

    case 'perplexity': {
      return env.PERPLEXITY_API_KEY
    }

    case 'groq': {
      return env.GROQ_API_KEY
    }

    case 'deepseek': {
      return env.DEEPSEEK_API_KEY
    }
  }
}

function hasAnyFallbackKey(): boolean {
  return ['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek'].some((provider) =>
    Boolean(fallbackProviderKey(provider as ProviderId)?.trim()),
  )
}

function toKeyHint(rawKey: string): string {
  const normalized = rawKey.trim()

  if (normalized.length <= 4) {
    return '••••'
  }

  return `••••${normalized.slice(-4)}`
}

function assertProvider(provider: string): asserts provider is ProviderId {
  if (!['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek'].includes(provider)) {
    throw new Error(`Unsupported provider: ${provider}`)
  }
}

export async function listUserProviderKeys(userId: string): Promise<ProviderKeyListItem[]> {
  const rows = await db
    .select()
    .from(userAiProviderKey)
    .where(eq(userAiProviderKey.userId, userId))
    .orderBy(desc(userAiProviderKey.updatedAt))

  return rows.map((row) => {
    const decrypted = decryptSecret({
      encryptedKey: row.encryptedKey,
      keyIv: row.keyIv,
      keyAuthTag: row.keyAuthTag,
      keyVersion: row.keyVersion,
    })

    return {
      id: row.id,
      provider: row.provider as ProviderId,
      label: row.label,
      active: row.isDefault,
      keyHint: toKeyHint(decrypted),
    }
  })
}

export async function upsertUserProviderKey(input: {
  userId: string
  provider: string
  key: string
  label?: string
  setDefault?: boolean
}): Promise<ProviderKeyListItem> {
  assertProvider(input.provider)

  const key = input.key.trim()

  if (!key) {
    throw new Error('API key is empty')
  }

  const encrypted = encryptSecret(key)
  const label = input.label?.trim() || DEFAULT_LABEL_BY_PROVIDER[input.provider]

  const [existing] = await db
    .select()
    .from(userAiProviderKey)
    .where(
      and(
        eq(userAiProviderKey.userId, input.userId),
        eq(userAiProviderKey.provider, input.provider),
        eq(userAiProviderKey.label, label),
      ),
    )
    .limit(1)

  return db.transaction(async (tx) => {
    if (input.setDefault) {
      await tx
        .update(userAiProviderKey)
        .set({
          isDefault: false,
          updatedAt: sql`now()`,
        })
        .where(and(eq(userAiProviderKey.userId, input.userId), eq(userAiProviderKey.provider, input.provider)))
    }

    let row: typeof userAiProviderKey.$inferSelect

    if (existing) {
      ;[row] = await tx
        .update(userAiProviderKey)
        .set({
          encryptedKey: encrypted.encryptedKey,
          keyIv: encrypted.keyIv,
          keyAuthTag: encrypted.keyAuthTag,
          keyVersion: encrypted.keyVersion,
          isDefault: input.setDefault ? true : existing.isDefault,
          updatedAt: sql`now()`,
        })
        .where(eq(userAiProviderKey.id, existing.id))
        .returning()
    } else {
      ;[row] = await tx
        .insert(userAiProviderKey)
        .values({
          userId: input.userId,
          provider: input.provider,
          label,
          encryptedKey: encrypted.encryptedKey,
          keyIv: encrypted.keyIv,
          keyAuthTag: encrypted.keyAuthTag,
          keyVersion: encrypted.keyVersion,
          isDefault: Boolean(input.setDefault),
        })
        .returning()
    }

    if (input.setDefault) {
      await tx
        .insert(userAiPreferences)
        .values({
          userId: input.userId,
          defaultProvider: input.provider,
        })
        .onConflictDoUpdate({
          target: userAiPreferences.userId,
          set: { defaultProvider: input.provider },
        })
    }

    return {
      id: row.id,
      provider: row.provider as ProviderId,
      label: row.label,
      active: row.isDefault,
      keyHint: toKeyHint(key),
    }
  })
}

export async function setDefaultUserProviderKey(userId: string, id: number): Promise<void> {
  const [target] = await db
    .select()
    .from(userAiProviderKey)
    .where(and(eq(userAiProviderKey.id, id), eq(userAiProviderKey.userId, userId)))
    .limit(1)

  if (!target) {
    throw new Error('Provider key not found')
  }

  await db.transaction(async (tx) => {
    await tx
      .update(userAiProviderKey)
      .set({ isDefault: false, updatedAt: sql`now()` })
      .where(and(eq(userAiProviderKey.userId, userId), eq(userAiProviderKey.provider, target.provider)))

    await tx
      .update(userAiProviderKey)
      .set({ isDefault: true, updatedAt: sql`now()` })
      .where(eq(userAiProviderKey.id, id))

    await tx
      .insert(userAiPreferences)
      .values({
        userId,
        defaultProvider: target.provider,
      })
      .onConflictDoUpdate({
        target: userAiPreferences.userId,
        set: { defaultProvider: target.provider },
      })
  })
}

export async function deleteUserProviderKey(userId: string, id: number): Promise<void> {
  await db.delete(userAiProviderKey).where(and(eq(userAiProviderKey.id, id), eq(userAiProviderKey.userId, userId)))
}

export async function importLegacyProviderKeys(
  userId: string,
  rows: { provider: string; label?: string; key?: string; active?: boolean }[],
): Promise<number> {
  let imported = 0

  for (const row of rows) {
    if (!row.key?.trim()) {
      continue
    }

    try {
      await upsertUserProviderKey({
        userId,
        provider: row.provider,
        key: row.key,
        label: row.label,
        setDefault: row.active,
      })
      imported += 1
    } catch {
      // Ignore invalid rows from legacy browser storage.
    }
  }

  return imported
}

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
    candidates.push({
      key: fallbackKey,
      source: 'env',
      keyId: null,
      label: `${provider}-env`,
      isDefault: false,
    })
  }

  const platformConfig = getPlatformKeyConfig()

  if (platformConfig && platformConfig.provider === provider) {
    candidates.push({
      key: platformConfig.key,
      source: 'platform',
      keyId: null,
      label: 'platform',
      isDefault: false,
    })
  }

  return candidates
}

export async function getUserDefaultProvider(userId: string): Promise<ProviderId | null> {
  const [row] = await db.select().from(userAiPreferences).where(eq(userAiPreferences.userId, userId)).limit(1)

  if (!row?.defaultProvider) {
    return null
  }

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
    .values({
      userId,
      defaultProvider: provider,
    })
    .onConflictDoUpdate({
      target: userAiPreferences.userId,
      set: { defaultProvider: provider },
    })
}

export const ALL_PROVIDERS: ProviderId[] = ['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek']

export async function listConfiguredProviderIds(userId: string): Promise<ProviderId[]> {
  const results = await Promise.all(
    ALL_PROVIDERS.map(async (p) => {
      const [first] = await listProviderApiKeyCandidates(userId, p, 1)

      return first ? p : null
    }),
  )

  return results.filter((p): p is ProviderId => p !== null)
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
