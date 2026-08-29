export const SENSITIVE_ACTION_FRESH_AGE_SECONDS = 10 * 60

export function isSessionFresh(createdAt: Date | string, now = Date.now()) {
  const createdAtMs = new Date(createdAt).getTime()

  return Number.isFinite(createdAtMs) && now - createdAtMs < SENSITIVE_ACTION_FRESH_AGE_SECONDS * 1000
}
