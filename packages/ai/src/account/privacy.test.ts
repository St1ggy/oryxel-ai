import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type UserExportPayload, collectUserExportData, deleteUserDataCompletely, toMarkdownExport } from './privacy'

import type * as OryxelDatabaseModule from '@oryxel/db'

const state = vi.hoisted(() => ({
  deletedTables: [] as string[],
  lockUserIds: [] as string[],
  operations: [] as string[],
  selectedRows: {} as Record<string, unknown[]>,
  transactionConfig: undefined as unknown,
  updatedTables: [] as { table: string; values: unknown }[],
}))

function createUpdateBuilder(tableName: string) {
  return {
    set(values: unknown) {
      state.updatedTables.push({ table: tableName, values })
      state.operations.push(`update:${tableName}`)

      return { where: () => Promise.resolve() }
    },
  }
}

vi.mock('../ai/crypto/secret-box', () => ({
  decryptSecret: ({ encryptedKey }: { encryptedKey: string }) => encryptedKey,
}))

vi.mock('@oryxel/db', async (importOriginal) => {
  const actual = await importOriginal<typeof OryxelDatabaseModule>()
  const tableNames = new Map<unknown, string>([
    [actual.notification, 'notification'],
    [actual.notificationPreference, 'notification_preference'],
    [actual.backgroundJob, 'background_job'],
    [actual.post, 'post'],
    [actual.postAttachment, 'post_attachment'],
    [actual.userList, 'user_list'],
    [actual.userListItem, 'user_list_item'],
    [actual.userFollow, 'user_follow'],
    [actual.aiPatchAuditLog, 'ai_patch_audit_log'],
    [actual.aiPendingPatch, 'ai_pending_patch'],
    [actual.userChatMessage, 'user_chat_message'],
    [actual.userActivityLog, 'user_activity_log'],
    [actual.userAgentMemory, 'user_agent_memory'],
    [actual.aiRecommendationDismissed, 'ai_recommendation_dismissed'],
    [actual.userAiProviderKey, 'user_ai_provider_key'],
    [actual.userAiPreferences, 'user_ai_preferences'],
    [actual.userFragrance, 'user_fragrance'],
    [actual.fragrance, 'fragrance'],
    [actual.brand, 'brand'],
    [actual.userProfile, 'user_profile'],
    [actual.session, 'session'],
    [actual.account, 'account'],
    [actual.verification, 'verification'],
    [actual.user, 'user'],
  ])

  function createSelectBuilder() {
    let rows: unknown[] = []
    const builder = {
      from(table: unknown) {
        rows = state.selectedRows[tableNames.get(table) ?? 'unknown'] ?? []

        return builder
      },
      where() {
        return Object.assign(Promise.resolve(rows), {
          limit: (count: number) => Promise.resolve(rows.slice(0, count)),
        })
      },
    }

    return builder
  }

  return {
    ...actual,
    db: {
      async transaction<T>(
        callback: (tx: {
          delete(table: unknown): { where(): Promise<void> }
          select(): ReturnType<typeof createSelectBuilder>
          update(table: unknown): { set(values: unknown): { where(): Promise<void> } }
        }) => Promise<T>,
        config?: unknown,
      ) {
        state.transactionConfig = config

        return callback({
          delete(table) {
            const tableName = tableNames.get(table) ?? 'unknown'

            state.deletedTables.push(tableName)
            state.operations.push(`delete:${tableName}`)

            return { where: () => Promise.resolve() }
          },
          select: createSelectBuilder,
          update(table) {
            const tableName = tableNames.get(table) ?? 'unknown'

            return createUpdateBuilder(tableName)
          },
        })
      },
    },
    withUserDataLock: (userId: string, callback: () => Promise<unknown>) => {
      state.lockUserIds.push(userId)

      return callback()
    },
  }
})

beforeEach(() => {
  state.deletedTables = []
  state.lockUserIds = []
  state.operations = []
  state.selectedRows = {}
  state.transactionConfig = undefined
  state.updatedTables = []
})

describe('deleteUserDataCompletely', () => {
  it.each([undefined, 'user@example.com'])(
    'deletes every user-owned domain before deleting the user',
    async (userEmail) => {
      await deleteUserDataCompletely({ userId: 'user-1', userEmail })

      expect(state.deletedTables).toEqual([
        'notification',
        'notification_preference',
        'background_job',
        'post',
        'user_list',
        'user_follow',
        'ai_patch_audit_log',
        'ai_pending_patch',
        'user_chat_message',
        'user_activity_log',
        'user_agent_memory',
        'ai_recommendation_dismissed',
        'user_ai_provider_key',
        'user_ai_preferences',
        'user_fragrance',
        'fragrance',
        'brand',
        'user_profile',
        'session',
        'account',
        'verification',
        'user',
      ])
      expect(state.updatedTables).toEqual([
        { table: 'fragrance', values: { createdByUserId: null } },
        { table: 'brand', values: { createdByUserId: null } },
      ])
      expect(state.operations.indexOf('update:fragrance')).toBeLessThan(state.operations.indexOf('delete:user'))
      expect(state.operations.indexOf('update:brand')).toBeLessThan(state.operations.indexOf('delete:user'))
    },
  )
})

describe('collectUserExportData', () => {
  it('uses a consistent snapshot and omits credentials and runtime tokens', async () => {
    state.selectedRows = {}
    state.selectedRows['user'] = [
      {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        image: null,
        createdAt: new Date('2026-08-29T12:00:00.000Z'),
      },
    ]
    state.selectedRows['user_ai_provider_key'] = [
      {
        id: 1,
        provider: 'openai',
        label: 'Primary',
        encryptedKey: 'super-secret-1234',
        keyIv: 'iv',
        keyAuthTag: 'tag',
        keyVersion: 'v1',
        isDefault: true,
        createdAt: new Date('2026-08-29T12:00:00.000Z'),
        updatedAt: new Date('2026-08-29T12:00:00.000Z'),
      },
      {
        id: 2,
        provider: 'anthropic',
        label: 'Short key',
        encryptedKey: 'abc',
        keyIv: 'iv',
        keyAuthTag: 'tag',
        keyVersion: 'v1',
        isDefault: false,
        createdAt: new Date('2026-08-29T12:00:00.000Z'),
        updatedAt: new Date('2026-08-29T12:00:00.000Z'),
      },
    ]
    state.selectedRows['background_job'] = [{ id: 1, userId: 'user-1', leaseToken: 'lease-secret' }]
    state.selectedRows['session'] = [{ id: 'session-1', userId: 'user-1', token: 'session-secret' }]
    state.selectedRows['account'] = [
      {
        id: 'account-1',
        accountId: 'provider-user-1',
        providerId: 'google',
        userId: 'user-1',
        scope: 'openid',
        accessToken: 'access-secret',
        refreshToken: 'refresh-secret',
        idToken: 'id-secret',
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        password: 'password-secret',
        createdAt: new Date('2026-08-29T12:00:00.000Z'),
        updatedAt: new Date('2026-08-29T12:00:00.000Z'),
      },
    ]

    const payload = await collectUserExportData('user-1')
    const serialized = JSON.stringify(payload)

    expect(state.lockUserIds).toEqual(['user-1'])
    expect(state.transactionConfig).toEqual({ isolationLevel: 'repeatable read', accessMode: 'read only' })
    expect(payload.providerKeys[0]?.keyHint).toBe('••••1234')
    expect(payload.providerKeys[1]?.keyHint).toBe('••••')
    expect(serialized).not.toContain('super-secret')
    expect(serialized).not.toContain('lease-secret')
    expect(serialized).not.toContain('session-secret')
    expect(serialized).not.toContain('access-secret')
    expect(serialized).not.toContain('refresh-secret')
    expect(serialized).not.toContain('id-secret')
    expect(serialized).not.toContain('password-secret')
  })
})

describe('toMarkdownExport', () => {
  it('includes every exported user-data domain', () => {
    const payload = {
      exportedAt: '2026-08-29T12:00:00.000Z',
      user: null,
      profile: null,
      aiPreferences: null,
      providerKeys: [],
      diary: [],
      chatHistory: [],
      pendingPatches: [],
      patchAuditLog: [],
      recommendationDismissals: [],
      activityLog: [],
      agentMemory: [],
      backgroundJobs: [],
      lists: [],
      follows: [],
      posts: [],
      notifications: [],
      notificationPreferences: [],
      sessions: [],
      linkedAccounts: [],
    } satisfies UserExportPayload

    const markdown = toMarkdownExport(payload)

    expect(markdown).toContain('## Account')
    expect(markdown).toContain('## Recommendation Dismissals')
    expect(markdown).toContain('## Background Jobs')
    expect(markdown).toContain('## Lists')
    expect(markdown).toContain('## Posts')
    expect(markdown).toContain('## Notifications')
    expect(markdown).toContain('## Sessions (tokens omitted)')
    expect(markdown).toContain('## Linked Accounts (credentials omitted)')
  })
})
