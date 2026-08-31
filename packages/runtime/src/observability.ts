export type LogService = 'job-stream-gateway' | 'web' | 'worker'
export type LogLevel = 'error' | 'info' | 'warn'

export type LogFields = {
  requestId?: string
  method?: string
  path?: string
  status?: number | string
  durationMs?: number
  jobId?: number
  jobType?: string
  count?: number
  component?: string
  intervalMs?: number
  mode?: string
  outcome?: string
  signal?: string
  port?: number
}

export type LogRecord = LogFields & {
  timestamp: string
  level: LogLevel
  service: LogService
  event: string
  errorName?: string
  errorCode?: string | number
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const MAX_LOG_STRING_LENGTH = 500

function redactUrlCredentials(value: string) {
  let sanitized = value
  let searchFrom = 0

  while (searchFrom < sanitized.length) {
    const schemeEnd = sanitized.indexOf('://', searchFrom)

    if (schemeEnd === -1) break

    const credentialsStart = schemeEnd + 3
    let authorityEnd = credentialsStart

    while (authorityEnd < sanitized.length && !/[\s/,;]/u.test(sanitized[authorityEnd] ?? '')) authorityEnd += 1

    const at = sanitized.indexOf('@', credentialsStart)

    if (at === -1 || at >= authorityEnd) {
      searchFrom = authorityEnd + 1

      continue
    }

    sanitized = `${sanitized.slice(0, credentialsStart)}[REDACTED]@${sanitized.slice(at + 1)}`
    searchFrom = credentialsStart + '[REDACTED]@'.length
  }

  return sanitized
}

function sanitizeString(key: string, value: string) {
  const boundedValue = redactUrlCredentials(value).slice(0, MAX_LOG_STRING_LENGTH)
  const withoutQuery = key === 'path' ? boundedValue.split('?', 1)[0] : boundedValue

  return withoutQuery
    .replaceAll(/\bBearer\s+[^\s,;]+/giu, 'Bearer [REDACTED]')
    .replaceAll(/((?:token|secret|password|api[_-]?key)\s*[=:]\s*)[^\s,;]+/giu, '$1[REDACTED]')
    .replaceAll(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, '[REDACTED_JWT]')
}

function sanitizeFields(fields: LogFields) {
  const sanitized: Record<string, string | number> = {}

  for (const [key, value] of Object.entries(fields)) {
    sanitized[key] = typeof value === 'string' ? sanitizeString(key, value) : value
  }

  return sanitized
}

function errorFields(error: unknown) {
  const fallback = { errorName: 'UnknownError' }

  if (!(error instanceof Error)) return fallback

  const code = (error as Error & { code?: unknown }).code

  return {
    errorName: sanitizeString('errorName', error.name || 'Error'),
    ...(typeof code === 'string' || typeof code === 'number' ? { errorCode: code } : {}),
  }
}

export function resolveRequestId(
  rawValue: string | null | undefined,
  generate: () => string = () => crypto.randomUUID(),
) {
  const candidate = rawValue?.trim()

  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : generate()
}

export function createLogRecord(
  service: LogService,
  event: string,
  fields: LogFields = {},
  level: LogLevel = 'info',
  now = new Date(),
): LogRecord {
  return {
    ...sanitizeFields(fields),
    timestamp: now.toISOString(),
    level,
    service,
    event: sanitizeString('event', event),
  }
}

export function logEvent(service: LogService, event: string, fields: LogFields = {}, level: LogLevel = 'info') {
  const line = JSON.stringify(createLogRecord(service, event, fields, level))

  if (level === 'error') {
    // eslint-disable-next-line no-console -- platform log collectors consume stdout/stderr
    console.error(line)
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console -- platform log collectors consume stdout/stderr
    console.warn(line)
  } else {
    // eslint-disable-next-line no-console -- platform log collectors consume stdout/stderr
    console.log(line)
  }
}

export function logError(service: LogService, event: string, error: unknown, fields: LogFields = {}) {
  const line = JSON.stringify({ ...createLogRecord(service, event, fields, 'error'), ...errorFields(error) })

  // eslint-disable-next-line no-console -- platform log collectors consume stderr
  console.error(line)
}
