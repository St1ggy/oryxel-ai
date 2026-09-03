import { brand, fragrance } from '@oryxel/db'
import { type SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import { describe, expect, it } from 'vitest'

import { deleteOrphanedUserCatalogEntities, prepareUserCatalogForAccountDeletion } from './catalog-lifecycle'

describe('deleteOrphanedUserCatalogEntities', () => {
  it('deletes only user-origin identities without remaining references', async () => {
    const queryBuilder = drizzle.mock()
    const deletedTables: unknown[] = []
    const conditions: { getSQL(): SQL }[] = []
    const executor = {
      select: queryBuilder.select.bind(queryBuilder),
      delete(table: unknown) {
        deletedTables.push(table)

        return {
          where(condition: { getSQL(): SQL }) {
            conditions.push(condition)

            return Promise.resolve()
          },
        }
      },
    }

    await deleteOrphanedUserCatalogEntities(executor as never)

    const dialect = new PgDialect()
    const queries = conditions.map((condition) => dialect.sqlToQuery(condition.getSQL()))

    expect(deletedTables).toEqual([fragrance, brand])
    expect(queries[0]?.sql).toContain('"fragrance"."origin" = $1')
    expect(queries[0]?.sql).toContain('from "user_fragrance"')
    expect(queries[0]?.sql).toContain('from "ai_recommendation_dismissed"')
    expect(queries[0]?.sql).toContain('from "user_list_item"')
    expect(queries[0]?.sql).toContain('from "post_attachment"')
    expect(queries[0]?.params).toEqual(['user', 'fragrance'])
    expect(queries[1]?.sql).toContain('"brand"."origin" = $1')
    expect(queries[1]?.sql).toContain('from "fragrance"')
    expect(queries[1]?.sql).toContain('from "post_attachment"')
    expect(queries[1]?.params).toEqual(['user', 'brand'])
  })

  it('detaches the deleted owner only after orphan cleanup', async () => {
    const queryBuilder = drizzle.mock()
    const operations: string[] = []
    const updateConditions: { getSQL(): SQL }[] = []
    const executor = {
      select: queryBuilder.select.bind(queryBuilder),
      delete(table: unknown) {
        operations.push(table === fragrance ? 'delete:fragrance' : 'delete:brand')

        return { where: () => Promise.resolve() }
      },
      update(table: unknown) {
        const tableName = table === fragrance ? 'fragrance' : 'brand'

        return {
          set() {
            operations.push(`update:${tableName}`)

            return {
              where(condition: { getSQL(): SQL }) {
                updateConditions.push(condition)

                return Promise.resolve()
              },
            }
          },
        }
      },
    }

    await prepareUserCatalogForAccountDeletion(executor as never, 'user-1')

    expect(operations).toEqual(['delete:fragrance', 'delete:brand', 'update:fragrance', 'update:brand'])

    const dialect = new PgDialect()
    const queries = updateConditions.map((condition) => dialect.sqlToQuery(condition.getSQL()))

    expect(queries[0]?.params).toEqual(['user', 'user-1'])
    expect(queries[1]?.params).toEqual(['user', 'user-1'])
  })
})
