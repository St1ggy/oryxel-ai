import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  JobLeaseLostError,
  claimNextJob,
  completeJob,
  recoverExpiredJobs,
  releaseJobLease,
  renewJobLease,
} from './jobs'

import type * as OryxelDatabaseModule from '@oryxel/db'

const state = vi.hoisted(() => ({
  pending: null as null | {
    id: number
    userId: string
    type: string
    params: Record<string, unknown> | null
  },
  lock: null as null | { strength: string; config: Record<string, unknown> },
  updates: [] as Record<string, unknown>[],
  returning: [] as { id: number }[][],
}))

const emitJobUpdated = vi.hoisted(() => vi.fn())

function createExecutor() {
  return {
    select() {
      const builder = {
        from() {
          return builder
        },
        where() {
          return builder
        },
        orderBy() {
          return builder
        },
        for(strength: string, config: Record<string, unknown>) {
          state.lock = { strength, config }

          return builder
        },
        async limit() {
          return state.pending ? [{ ...state.pending }] : []
        },
      }

      return builder
    },
    update() {
      const builder = {
        set(values: Record<string, unknown>) {
          state.updates.push(values)

          return builder
        },
        where() {
          return builder
        },
        async returning() {
          return state.returning.shift() ?? []
        },
      }

      return builder
    },
  }
}

vi.mock('@oryxel/db', async (importOriginal) => {
  const actual = await importOriginal<typeof OryxelDatabaseModule>()
  const database = {
    ...createExecutor(),
    transaction<T>(callback: (tx: ReturnType<typeof createExecutor>) => Promise<T>) {
      return callback(createExecutor())
    },
  }

  return { ...actual, db: database }
})

vi.mock('./job-notify', () => ({
  emitJobCreated: vi.fn(),
  emitJobUpdated,
}))

beforeEach(() => {
  state.pending = null
  state.lock = null
  state.updates = []
  state.returning = []
  emitJobUpdated.mockClear()
})

describe('background job leases', () => {
  it('claims pending work with a skip-locked row lock', async () => {
    state.pending = {
      id: 7,
      userId: 'user-1',
      type: 'agent_chat',
      params: { message: 'hello' },
    }
    state.returning = [[{ id: 7 }]]

    const claimed = await claimNextJob()

    expect(state.lock).toEqual({ strength: 'update', config: { skipLocked: true } })
    expect(claimed).toMatchObject({ id: 7, userId: 'user-1', type: 'agent_chat' })
    expect(claimed?.leaseToken).toMatch(/^[\da-f-]{36}$/)
    expect(state.updates[0]).toMatchObject({ status: 'processing', leaseToken: claimed?.leaseToken })
  })

  it('does not publish a terminal update after lease ownership is lost', async () => {
    state.returning = [[]]
    const lease = { id: 7, leaseToken: '00000000-0000-4000-8000-000000000000' }

    await expect(completeJob(lease, { ok: true })).rejects.toBeInstanceOf(JobLeaseLostError)
    expect(emitJobUpdated).not.toHaveBeenCalled()
  })

  it('renews only an active matching lease', async () => {
    const lease = { id: 7, leaseToken: '00000000-0000-4000-8000-000000000000' }

    state.returning = [[], [{ id: 7 }]]

    await expect(renewJobLease(lease)).resolves.toBe(false)
    await expect(renewJobLease(lease)).resolves.toBe(true)
    expect(emitJobUpdated).not.toHaveBeenCalled()
  })

  it('returns an unstarted shutdown claim to the pending queue', async () => {
    const lease = { id: 7, leaseToken: '00000000-0000-4000-8000-000000000000' }

    state.returning = [[{ id: 7 }]]

    await expect(releaseJobLease(lease)).resolves.toBe(true)
    expect(state.updates[0]).toMatchObject({ status: 'pending', leaseToken: null, leaseExpiresAt: null })
    expect(emitJobUpdated).not.toHaveBeenCalled()
  })

  it('publishes each expired job recovered by the database update', async () => {
    state.returning = [[{ id: 3 }, { id: 9 }]]

    await expect(recoverExpiredJobs()).resolves.toEqual([3, 9])
    expect(emitJobUpdated.mock.calls).toEqual([[3], [9]])
    expect(state.updates[0]).toMatchObject({
      status: 'failed',
      errorMessage: 'Worker lease expired',
      leaseToken: null,
      leaseExpiresAt: null,
    })
  })
})
