export type ReadinessCheck = {
  name: string
  required?: boolean
  check: () => Promise<unknown>
}

export type ReadinessResult = {
  ready: boolean
  checks: Record<string, { status: 'ok' | 'error'; required: boolean }>
}

const DEFAULT_TIMEOUT_MS = 2000
const MAX_TIMEOUT_MS = 10_000

async function withTimeout(check: () => Promise<unknown>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      check(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Health check timed out')), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function parseHealthCheckTimeout(rawValue: string | undefined) {
  const parsed = Number.parseInt(rawValue ?? '', 10)

  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS

  return Math.min(parsed, MAX_TIMEOUT_MS)
}

export async function runReadinessChecks(checks: ReadinessCheck[], timeoutMs: number): Promise<ReadinessResult> {
  const entries = await Promise.all(
    checks.map(async ({ name, required = true, check }) => {
      try {
        await withTimeout(check, timeoutMs)

        return [name, { status: 'ok' as const, required }] as const
      } catch {
        return [name, { status: 'error' as const, required }] as const
      }
    }),
  )
  const result = Object.fromEntries(entries) as ReadinessResult['checks']

  return {
    ready: Object.values(result).every((check) => !check.required || check.status === 'ok'),
    checks: result,
  }
}
