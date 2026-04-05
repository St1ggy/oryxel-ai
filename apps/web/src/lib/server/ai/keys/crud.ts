import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { userAiPreferences, userAiProviderKey } from '$lib/server/db/schema'

import { decryptSecret, encryptSecret } from '../crypto/secret-box'

import {
  DEFAULT_LABEL_BY_PROVIDER,
  type ProviderId,
  type ProviderKeyListItem,
  assertProvider,
  toKeyHint,
} from './types'

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
        .set({ isDefault: false, updatedAt: sql`now()` })
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
        .values({ userId: input.userId, defaultProvider: input.provider })
        .onConflictDoUpdate({ target: userAiPreferences.userId, set: { defaultProvider: input.provider } })
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
      .values({ userId, defaultProvider: target.provider })
      .onConflictDoUpdate({ target: userAiPreferences.userId, set: { defaultProvider: target.provider } })
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
