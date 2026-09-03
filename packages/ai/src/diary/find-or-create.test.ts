import { type SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it, vi } from 'vitest'

import { findOrCreateBrand, findOrCreateFragrance } from './find-or-create'

function createExecutor(selectResults: { id: number }[][]) {
  const insertedValues: unknown[] = []
  const conditions: { getSQL(): SQL }[] = []
  let selectIndex = 0
  const selectBuilder = {
    from() {
      return selectBuilder
    },
    where(condition: { getSQL(): SQL }) {
      conditions.push(condition)

      return selectBuilder
    },
    orderBy() {
      return selectBuilder
    },
    for: vi.fn(() => selectBuilder),
    limit: vi.fn(async () => selectResults[selectIndex++] ?? []),
  }
  const insertBuilder = {
    values(value: unknown) {
      insertedValues.push(value)

      return insertBuilder
    },
    onConflictDoNothing: vi.fn(() => Promise.resolve()),
  }

  return {
    executor: {
      select: vi.fn(() => selectBuilder),
      insert: vi.fn(() => insertBuilder),
    },
    insertedValues,
    conditions,
    onConflictDoNothing: insertBuilder.onConflictDoNothing,
  }
}

function renderConditions(conditions: { getSQL(): SQL }[]) {
  const dialect = new PgDialect()

  return conditions.map((condition) => dialect.sqlToQuery(condition.getSQL()))
}

describe('catalog find-or-create', () => {
  it('reuses a visible canonical or viewer-owned brand without inserting', async () => {
    const { executor, conditions } = createExecutor([[{ id: 7 }]])

    await expect(findOrCreateBrand(executor as never, 'Acme', 'user-1')).resolves.toBe(7)
    expect(executor.insert).not.toHaveBeenCalled()

    const [query] = renderConditions(conditions)

    expect(query?.sql).toContain('"brand"."origin" <> $2')
    expect(query?.sql).toContain('"brand"."created_by_user_id" = $3')
    expect(query?.params).toEqual(['Acme', 'user', 'user-1'])
  })

  it('creates independent same-name brands for different owners', async () => {
    const first = createExecutor([[], [{ id: 41 }]])
    const second = createExecutor([[], [{ id: 42 }]])

    await expect(findOrCreateBrand(first.executor as never, 'Acme', 'user-1')).resolves.toBe(41)
    await expect(findOrCreateBrand(second.executor as never, 'Acme', 'user-2')).resolves.toBe(42)
    expect(first.insertedValues).toEqual([{ name: 'Acme', origin: 'user', createdByUserId: 'user-1' }])
    expect(second.insertedValues).toEqual([{ name: 'Acme', origin: 'user', createdByUserId: 'user-2' }])
  })

  it('resolves the conflict winner instead of creating another fragrance identity', async () => {
    const { executor, insertedValues, onConflictDoNothing } = createExecutor([[], [{ id: 42 }]])

    await expect(findOrCreateFragrance(executor as never, 7, 'No. 5', 'user-1')).resolves.toBe(42)
    expect(insertedValues).toEqual([{ brandId: 7, name: 'No. 5', origin: 'user', createdByUserId: 'user-1' }])
    expect(onConflictDoNothing).toHaveBeenCalledOnce()
    expect(executor.select).toHaveBeenCalledTimes(2)
  })
})
