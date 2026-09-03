import { describe, expect, it, vi } from 'vitest'

vi.mock('$env/dynamic/private', () => ({
  env: {
    AI_KEYS_ENCRYPTION_KEY: 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=',
  },
}))

import { decryptSecret, encryptSecret } from './secret-box'

describe('secret-box', () => {
  it('encrypts and decrypts API key roundtrip', () => {
    const encrypted = encryptSecret('sk-test-123456789')
    const decrypted = decryptSecret(encrypted)

    expect(encrypted.encryptedKey).not.toContain('sk-test-123456789')
    expect(decrypted).toBe('sk-test-123456789')
  })

  it('rejects unknown key versions', () => {
    const encrypted = encryptSecret('key-value')

    expect(() =>
      decryptSecret({
        ...encrypted,
        keyVersion: 'v0',
      }),
    ).toThrow('Unsupported key version')
  })
})
