import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hasEffectiveProviderAccess, listProviderApiKeyCandidates } from './service'

const state = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
}))
const fallbackProviderKey = vi.hoisted(() => vi.fn())
const getPlatformKeyConfig = vi.hoisted(() => vi.fn())

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
}))

vi.mock('$lib/server/db', () => ({
  db: {
    select() {
      const builder = {
        from() {
          return builder
        },
        where() {
          return builder
        },
        orderBy() {
          return builder
        },
        async limit() {
          return state.selectResults.shift() ?? []
        },
      }

      return builder
    },
  },
}))

vi.mock('$lib/server/db/schema', () => ({
  userAiPreferences: { platformAccess: 'platformAccess', userId: 'preferencesUserId' },
  userAiProviderKey: {
    id: 'id',
    isDefault: 'isDefault',
    provider: 'provider',
    updatedAt: 'updatedAt',
    userId: 'keyUserId',
  },
}))

vi.mock('../crypto/secret-box', () => ({
  decryptSecret: vi.fn(),
}))

vi.mock('./crud', () => ({}))

vi.mock('./env-keys', () => ({
  fallbackProviderKey,
  getPlatformKeyConfig,
  hasAnyFallbackKey: vi.fn(() => false),
}))

beforeEach(() => {
  state.selectResults = []
  fallbackProviderKey.mockReset()
  getPlatformKeyConfig.mockReset().mockReturnValue({ provider: 'openai', key: 'platform-key' })
})

describe('platform AI access', () => {
  it('does not expose a platform key without an explicit grant', async () => {
    state.selectResults = [[], [{ platformAccess: false }]]

    await expect(listProviderApiKeyCandidates('user-1', 'openai')).resolves.toEqual([])
  })

  it('exposes a platform key after access is granted', async () => {
    state.selectResults = [[], [{ platformAccess: true }]]

    await expect(listProviderApiKeyCandidates('user-1', 'openai')).resolves.toEqual([
      {
        isDefault: false,
        key: 'platform-key',
        keyId: null,
        label: 'platform',
        source: 'platform',
      },
    ])
  })

  it('keeps provider environment keys available after platform access is revoked', async () => {
    fallbackProviderKey.mockReturnValue('environment-key')
    state.selectResults = [[], [{ platformAccess: false }]]

    await expect(listProviderApiKeyCandidates('user-1', 'openai')).resolves.toEqual([
      {
        isDefault: false,
        key: 'environment-key',
        keyId: null,
        label: 'openai-env',
        source: 'env',
      },
    ])
  })

  it('uses the same grant for effective platform access', async () => {
    state.selectResults = [[], [{ platformAccess: true }]]

    await expect(hasEffectiveProviderAccess('user-1')).resolves.toBe(true)
  })
})
