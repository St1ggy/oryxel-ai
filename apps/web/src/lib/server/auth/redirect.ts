export function sanitizeRedirectTarget(value: string | null | undefined) {
  if (!value) return '/'

  if (!value.startsWith('/')) return '/'

  if (value.startsWith('//')) return '/'

  return value
}
