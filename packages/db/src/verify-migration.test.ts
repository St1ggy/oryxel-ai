import { describe, expect, it } from 'vitest'

import {
  areDatabaseTargetsDistinct,
  compareMigrationLedgers,
  compareSequenceStates,
  compareTableSets,
  isExactProductionReadiness,
} from './cutover-verification'

const sourceIdentity = {
  databaseName: 'oryxel',
  databaseOid: '16',
  systemIdentifier: 'system-1',
}

describe('database identity', () => {
  it('rejects the same physical database behind different URL strings', () => {
    expect(
      areDatabaseTargetsDistinct(
        'postgresql://public.example/oryxel',
        'postgresql://private.example/oryxel',
        sourceIdentity,
        sourceIdentity,
      ),
    ).toBe(false)
  })
})

describe('migration ledger comparison', () => {
  it('reports missing and checksum-mismatched migrations', () => {
    expect(
      compareMigrationLedgers(
        [
          { hash: '0000', checksum: 'a' },
          { hash: '0001', checksum: 'b' },
        ],
        [
          { hash: '0000', checksum: 'changed' },
          { hash: '0002', checksum: 'c' },
        ],
      ),
    ).toEqual({
      missingInDestination: ['0001'],
      missingInSource: ['0002'],
      checksumMismatches: ['0000'],
    })
  })
})

describe('sequence comparison', () => {
  it('detects ownership and value drift', () => {
    const source = {
      sequenceName: 'brand_id_seq',
      ownerTable: 'brand',
      ownerColumn: 'id',
      lastValue: '10',
      isCalled: true,
    }

    expect(
      compareSequenceStates([source], [{ ...source, ownerTable: 'fragrance', lastValue: '11' }]).mismatches,
    ).toEqual([source])
  })
})

describe('table comparison', () => {
  it('rejects destination-only tables unless explicitly allowlisted', () => {
    expect(compareTableSets(['user'], ['user', 'audit'], new Set())).toEqual({
      missingInDestination: [],
      unexpectedInDestination: ['audit'],
      allowlistedInDestination: [],
    })
    expect(compareTableSets(['user'], ['user', 'audit'], new Set(['audit'])).allowlistedInDestination).toEqual([
      'audit',
    ])
  })
})

describe('production readiness comparison', () => {
  it('requires exact top-level and dependency readiness', () => {
    expect(
      isExactProductionReadiness(200, {
        status: 'ready',
        checks: { database: { status: 'ok' }, redis: { status: 'ok' } },
      }),
    ).toBe(true)
    expect(
      isExactProductionReadiness(200, {
        status: 'ready',
        checks: { database: { status: 'ok' }, redis: { status: 'error' } },
      }),
    ).toBe(false)
    expect(isExactProductionReadiness(503, { status: 'ready' })).toBe(false)
  })
})
