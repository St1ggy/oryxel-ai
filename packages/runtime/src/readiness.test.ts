import { describe, expect, it, vi } from 'vitest'

import { parseHealthCheckTimeout, runReadinessChecks } from './readiness'

describe('parseHealthCheckTimeout', () => {
  it.each([
    [undefined, 2000],
    ['', 2000],
    ['invalid', 2000],
    ['0', 2000],
    ['2500', 2500],
    ['20000', 10_000],
  ])('maps %s to %s milliseconds', (rawValue, expected) => {
    expect(parseHealthCheckTimeout(rawValue)).toBe(expected)
  })
})

describe('runReadinessChecks', () => {
  it('reports successful required dependencies as ready', async () => {
    const result = await runReadinessChecks([{ name: 'database', check: async () => true }], 100)

    expect(result).toEqual({
      ready: true,
      checks: { database: { status: 'ok', required: true } },
    })
  })

  it('reports a required dependency failure as unavailable', async () => {
    const result = await runReadinessChecks(
      [
        {
          name: 'database',
          check: async () => {
            throw new Error('unavailable')
          },
        },
      ],
      100,
    )

    expect(result).toEqual({
      ready: false,
      checks: { database: { status: 'error', required: true } },
    })
  })

  it('keeps an optional dependency failure ready', async () => {
    const result = await runReadinessChecks(
      [
        {
          name: 'redis',
          required: false,
          check: async () => {
            throw new Error('unavailable')
          },
        },
      ],
      100,
    )

    expect(result.ready).toBe(true)
    expect(result.checks.redis).toEqual({ status: 'error', required: false })
  })

  it('bounds slow dependency checks', async () => {
    vi.useFakeTimers()
    const resultPromise = runReadinessChecks(
      [
        {
          name: 'database',
          check: () => new Promise((resolve) => setTimeout(resolve, 1000)),
        },
      ],
      100,
    )

    await vi.advanceTimersByTimeAsync(100)
    await expect(resultPromise).resolves.toEqual({
      ready: false,
      checks: { database: { status: 'error', required: true } },
    })
    vi.useRealTimers()
  })
})
