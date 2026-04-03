import { beforeEach, describe, expect, it } from 'vitest'

import { decryptSecret, encryptSecret } from './secret-box'

describe('secret-box', () => {
  beforeEach(() => {
    process.env.AI_KEYS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
  })

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
