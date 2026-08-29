import { describe, expect, it, vi } from 'vitest'

import { findOrCreateBrand, findOrCreateFragrance } from './find-or-create'

function createExecutor(existingRows: { id: number }[] = [], insertedRows: { id: number }[] = [{ id: 42 }]) {
  const insertedValues: unknown[] = []
  const selectBuilder = {
    from() {
      return selectBuilder
    },
    where() {
      return selectBuilder
    },
    for: vi.fn(() => selectBuilder),
    limit: vi.fn(async () => existingRows),
  }
  const insertBuilder = {
    values(value: unknown) {
      insertedValues.push(value)

      return insertBuilder
    },
    onConflictDoNothing() {
      return insertBuilder
    },
    returning: vi.fn(async () => insertedRows),
  }

  return {
    executor: {
      select: vi.fn(() => selectBuilder),
      insert: vi.fn(() => insertBuilder),
    },
    insertedValues,
  }
}

describe('catalog find-or-create', () => {
  it('creates brands with user provenance', async () => {
    const { executor, insertedValues } = createExecutor([{ id: 42 }])

    await expect(findOrCreateBrand(executor as never, 'Acme', 'user-1')).resolves.toBe(42)
    expect(insertedValues).toEqual([{ name: 'Acme', origin: 'user', createdByUserId: 'user-1' }])
  })

  it('uses conflict-safe inserts without updating existing brand provenance', async () => {
    const { executor, insertedValues } = createExecutor([{ id: 7 }])

    await expect(findOrCreateBrand(executor as never, 'Acme', 'user-1')).resolves.toBe(7)
    expect(insertedValues).toEqual([{ name: 'Acme', origin: 'user', createdByUserId: 'user-1' }])
    expect(executor.insert).toHaveBeenCalledOnce()
  })

  it('creates only fragrance identity fields in the shared catalog', async () => {
    const { executor, insertedValues } = createExecutor()

    await expect(findOrCreateFragrance(executor as never, 7, 'No. 5', 'user-1')).resolves.toBe(42)
    expect(insertedValues).toEqual([{ brandId: 7, name: 'No. 5', origin: 'user', createdByUserId: 'user-1' }])
  })
})
