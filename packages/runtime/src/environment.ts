export function isProductionRuntime(environment: Record<string, string | undefined> = process.env) {
  return environment['NODE_ENV'] === 'production' || Boolean(environment['RAILWAY_DEPLOYMENT_ID'])
}

export function parsePositiveInteger(rawValue: string | undefined, fallback: number, name: string) {
  if (!rawValue?.trim()) return fallback

  const value = Number(rawValue)

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }

  return value
}
