import { type SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { searchFragrances } from './search'

function createExecutor() {
  let condition: { getSQL(): SQL } | undefined
  const builder = {
    from() {
      return builder
    },
    innerJoin() {
      return builder
    },
    where(value: { getSQL(): SQL }) {
      condition = value

      return builder
    },
    orderBy() {
      return builder
    },
    limit: async () => [],
  }

  return {
    executor: { select: () => builder },
    getCondition: () => condition,
  }
}

describe('searchFragrances', () => {
  it('searches only canonical or viewer-owned identities', async () => {
    const { executor, getCondition } = createExecutor()

    await searchFragrances('rose', 'user-b', 20, executor as never)

    const condition = getCondition()

    expect(condition).toBeDefined()

    const query = new PgDialect().sqlToQuery(condition!.getSQL())

    expect(query.sql).toContain('"fragrance"."origin" <>')
    expect(query.sql).toContain('"fragrance"."created_by_user_id" =')
    expect(query.sql).toContain('"brand"."origin" <>')
    expect(query.sql).toContain('"brand"."created_by_user_id" =')
    expect(query.params.filter((parameter) => parameter === 'user-b')).toHaveLength(2)
    expect(query.params).not.toContain('user-a')
  })
})
