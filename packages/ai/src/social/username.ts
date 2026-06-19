const RESERVED = new Set([
  'admin',
  'api',
  'discover',
  'feed',
  'lists',
  'login',
  'notifications',
  'settings',
  'diary',
  'profile',
  'u',
  'user',
  'users',
  'oryxel',
])

const USERNAME_RE = /^[a-z][a-z0-9_]{2,29}$/

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase()
}

export function validateUsername(username: string) {
  const normalized = normalizeUsername(username)

  if (!USERNAME_RE.test(normalized)) {
    return 'USERNAME_INVALID'
  }

  if (RESERVED.has(normalized)) {
    return 'USERNAME_RESERVED'
  }

  return null
}
