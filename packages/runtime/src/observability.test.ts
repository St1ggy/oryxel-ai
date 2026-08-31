import { describe, expect, it, vi } from 'vitest'

import { createLogRecord, logError, resolveRequestId } from './observability'

describe('resolveRequestId', () => {
  it('preserves a bounded caller request ID', () => {
    expect(resolveRequestId('req_01HZX-abc', vi.fn())).toBe('req_01HZX-abc')
  })

  it('generates a request ID for missing or unsafe values', () => {
    const generate = vi.fn(() => 'generated-id')

    expect(resolveRequestId('contains spaces', generate)).toBe('generated-id')
    expect(resolveRequestId(null, generate)).toBe('generated-id')
    expect(generate).toHaveBeenCalledTimes(2)
  })
})

describe('createLogRecord', () => {
  it('creates stable structured records and removes URL queries', () => {
    expect(
      createLogRecord(
        'web',
        'http.request.completed',
        { requestId: 'request-1', method: 'GET', path: '/stream?token=secret', status: 200, durationMs: 12 },
        'info',
        new Date('2026-08-31T00:00:00.000Z'),
      ),
    ).toEqual({
      timestamp: '2026-08-31T00:00:00.000Z',
      level: 'info',
      service: 'web',
      event: 'http.request.completed',
      requestId: 'request-1',
      method: 'GET',
      path: '/stream',
      status: 200,
      durationMs: 12,
    })
  })

  it('redacts credentials and bearer values from string fields', () => {
    const record = createLogRecord('worker', 'redis.failed', {
      component: 'https://user:password@example.test redis://user:password@cache.test Bearer abc.def token=secret',
    })

    expect(record.component).toBe(
      'https://[REDACTED]@example.test redis://[REDACTED]@cache.test Bearer [REDACTED] token=[REDACTED]',
    )
  })
})

describe('logError', () => {
  it('writes error metadata without arbitrary messages or stacks', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => false)
    const error = Object.assign(new Error('connect redis://user:secret@example.test'), { code: 'ECONNREFUSED' })

    logError('worker', 'redis.failed', error, { component: 'publisher' })

    expect(output).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(output.mock.calls[0]?.[0]))).toMatchObject({
      level: 'error',
      service: 'worker',
      event: 'redis.failed',
      component: 'publisher',
      errorName: 'Error',
      errorCode: 'ECONNREFUSED',
    })
    expect(String(output.mock.calls[0]?.[0])).not.toContain('example.test')
    expect(String(output.mock.calls[0]?.[0])).not.toContain('stack')

    output.mockRestore()
  })
})
