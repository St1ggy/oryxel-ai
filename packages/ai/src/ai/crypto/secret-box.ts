import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const KEY_VERSION = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH_BYTES = 12

type EncryptedSecret = {
  encryptedKey: string
  keyIv: string
  keyAuthTag: string
  keyVersion: string
}

let cachedKey: Buffer | null = null

function getMasterKey(): Buffer {
  if (cachedKey) {
    return cachedKey
  }

  const rawKey = process.env.AI_KEYS_ENCRYPTION_KEY?.trim()

  if (!rawKey) {
    throw new Error('AI_KEYS_ENCRYPTION_KEY is not set')
  }

  let decoded: Buffer

  try {
    decoded = Buffer.from(rawKey, 'base64')
  } catch {
    throw new Error('AI_KEYS_ENCRYPTION_KEY must be valid base64')
  }

  if (decoded.length !== 32) {
    throw new Error('AI_KEYS_ENCRYPTION_KEY must decode to exactly 32 bytes')
  }

  cachedKey = decoded

  return decoded
}

export function encryptSecret(plain: string): EncryptedSecret {
  if (!plain.trim()) {
    throw new Error('Secret is empty')
  }

  const iv = randomBytes(IV_LENGTH_BYTES)
  const cipher = createCipheriv(ALGORITHM, getMasterKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    encryptedKey: encrypted.toString('base64'),
    keyIv: iv.toString('base64'),
    keyAuthTag: authTag.toString('base64'),
    keyVersion: KEY_VERSION,
  }
}

export function decryptSecret(payload: {
  encryptedKey: string
  keyIv: string
  keyAuthTag: string
  keyVersion: string
}): string {
  if (payload.keyVersion !== KEY_VERSION) {
    throw new Error(`Unsupported key version: ${payload.keyVersion}`)
  }

  const iv = Buffer.from(payload.keyIv, 'base64')
  const authTag = Buffer.from(payload.keyAuthTag, 'base64')
  const encrypted = Buffer.from(payload.encryptedKey, 'base64')

  const decipher = createDecipheriv(ALGORITHM, getMasterKey(), iv)

  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

  return decrypted.toString('utf8')
}
