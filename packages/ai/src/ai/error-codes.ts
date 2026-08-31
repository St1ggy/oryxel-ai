const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/

export function normalizeErrorCode(value: string, fallback: string) {
  return ERROR_CODE_PATTERN.test(value) ? value : fallback
}
