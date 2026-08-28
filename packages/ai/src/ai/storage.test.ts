import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyPendingPatch, rejectPendingPatch } from './storage'

import type * as OryxelDatabaseModule from '@oryxel/db'

const state = vi.hoisted(() => ({
  patch: null as null | {
    id: number
    userId: string
    status: string
    payload: Record<string, unknown>
  },
  audits: [] as { action: string }[],
  lockCalls: 0,
  transactionTail: Promise.resolve() as Promise<unknown>,
}))

const applyPatchToDatabase = vi.hoisted(() => vi.fn(async () => null))
const applyListOps = vi.hoisted(() =>
  vi.fn(async () => ({
    createdListIds: [],
    notifyList: false,
  })),
)
const enqueueListNotifyJob = vi.hoisted(() => vi.fn(async () => null))

function createExecutor() {
  return {
    select(selection?: Record<string, unknown>) {
      const builder = {
        from() {
          return builder
        },
        where() {
          return builder
        },
        for() {
          state.lockCalls += 1

          return builder
        },
        async limit() {
          if (!state.patch) return []

          if (selection) {
            return [{ id: state.patch.id, status: state.patch.status }]
          }

          return [{ ...state.patch }]
        },
      }

      return builder
    },
    update() {
      let values: Record<string, unknown> = {}
      let committed = false

      const commit = () => {
        if (committed || !state.patch) return []

        committed = true
        state.patch = { ...state.patch, ...values }

        return [{ id: state.patch.id }]
      }
      const builder = {
        set(nextValues: Record<string, unknown>) {
          values = nextValues

          return builder
        },
        where() {
          return builder
        },
        async returning() {
          return commit()
        },
      }

      return builder
    },
    insert() {
      return {
        async values(value: { action?: string }) {
          if (value.action) state.audits.push({ action: value.action })
        },
      }
    },
  }
}

vi.mock('@oryxel/db', async (importOriginal) => {
  const actual = await importOriginal<typeof OryxelDatabaseModule>()

  const executor = createExecutor()
  const database = {
    ...executor,
    transaction<T>(callback: (tx: ReturnType<typeof createExecutor>) => Promise<T>) {
      const run = state.transactionTail.then(async () => {
        const patchSnapshot = state.patch ? { ...state.patch } : null
        const auditCount = state.audits.length

        try {
          return await callback(createExecutor())
        } catch (error) {
          state.patch = patchSnapshot
          state.audits.length = auditCount
          throw error
        }
      })

      state.transactionTail = run.catch(() => null)

      return run
    },
  }

  return { ...actual, db: database }
})

vi.mock('./apply', () => ({ applyPatchToDatabase }))
vi.mock('../social/apply-list-ops', () => ({ applyListOps, enqueueListNotifyJob }))

const payload = {
  confidence: 0.9,
  summary: 'Remove an entry',
  tableOps: [{ op: 'remove', rowId: 1 }],
}

beforeEach(() => {
  state.patch = { id: 1, userId: 'user-1', status: 'created', payload }
  state.audits = []
  state.lockCalls = 0
  state.transactionTail = Promise.resolve()
  applyPatchToDatabase.mockClear()
  applyListOps.mockClear()
  enqueueListNotifyJob.mockClear()
})

describe('applyPendingPatch', () => {
  it('applies concurrent confirmations exactly once', async () => {
    const input = {
      patchId: 1,
      userId: 'user-1',
      expectedStatus: 'created' as const,
      recordConfirmation: true,
    }
    const [first, second] = await Promise.all([applyPendingPatch(input), applyPendingPatch(input)])

    expect(first).toMatchObject({ status: 'applied', wasAlreadyApplied: false })
    expect(second).toMatchObject({ status: 'applied', wasAlreadyApplied: true })
    expect(applyPatchToDatabase).toHaveBeenCalledTimes(1)
    expect(state.lockCalls).toBe(2)
    expect(state.audits.map(({ action }) => action)).toEqual(['confirmed', 'applied'])
    expect(state.patch?.status).toBe('applied')
  })

  it('creates list notifications in the same winning transaction', async () => {
    state.patch = {
      ...state.patch!,
      payload: {
        ...payload,
        listOps: [{ op: 'create', title: 'Favorites', visibility: 'public' }],
      },
    }
    applyListOps.mockResolvedValueOnce({ createdListIds: [9], notifyList: true })

    const input = {
      patchId: 1,
      userId: 'user-1',
      expectedStatus: 'created' as const,
      recordConfirmation: true,
    }

    await Promise.all([applyPendingPatch(input), applyPendingPatch(input)])

    expect(applyListOps).toHaveBeenCalledTimes(1)
    expect(enqueueListNotifyJob).toHaveBeenCalledTimes(1)
    const transactionExecutor = applyPatchToDatabase.mock.calls[0]?.[2]

    expect(applyListOps.mock.calls[0]?.[2]).toBe(transactionExecutor)
    expect(enqueueListNotifyJob).toHaveBeenCalledWith('user-1', 9, transactionExecutor)
  })

  it('rolls back mutations and marks a failed apply once', async () => {
    applyPatchToDatabase.mockRejectedValueOnce(new Error('apply failed'))

    await expect(
      applyPendingPatch({
        patchId: 1,
        userId: 'user-1',
        expectedStatus: 'created',
        recordConfirmation: true,
      }),
    ).rejects.toThrow('apply failed')

    expect(state.patch?.status).toBe('failed')
    expect(state.audits.map(({ action }) => action)).toEqual(['failed'])
  })
})

describe('rejectPendingPatch', () => {
  it('is idempotent and conflicts with an applied patch', async () => {
    const first = await rejectPendingPatch({ patchId: 1, userId: 'user-1' })
    const second = await rejectPendingPatch({ patchId: 1, userId: 'user-1' })

    expect(first).toEqual({ status: 'rejected', wasAlreadyRejected: false })
    expect(second).toEqual({ status: 'rejected', wasAlreadyRejected: true })
    expect(state.audits.map(({ action }) => action)).toEqual(['rejected'])

    state.patch = { ...state.patch!, status: 'applied' }

    await expect(rejectPendingPatch({ patchId: 1, userId: 'user-1' })).resolves.toEqual({
      status: 'conflict',
      currentStatus: 'applied',
    })
  })
})
