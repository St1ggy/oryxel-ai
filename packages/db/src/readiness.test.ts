import { describe, expect, it } from 'vitest'

import { migrationManifest } from './migration-manifest'
import { assertMigrationHistoryReady } from './migration-readiness'

const expected = [
  { tag: '0000_first', checksum: 'checksum-0' },
  { tag: '0001_second', checksum: 'checksum-1' },
  { tag: '0002_third', checksum: 'checksum-2' },
] as const

describe('assertMigrationHistoryReady', () => {
  it('accepts the complete current application history', () => {
    expect(() =>
      assertMigrationHistoryReady(migrationManifest.map(({ tag, checksum }) => ({ hash: tag, checksum }))),
    ).not.toThrow()
  })

  it('rejects an unknown migration', () => {
    expect(() => assertMigrationHistoryReady([{ hash: '9999_unknown', checksum: 'checksum' }], expected)).toThrow(
      'unknown migration',
    )
  })

  it('rejects an incomplete trailing history', () => {
    expect(() =>
      assertMigrationHistoryReady(
        [
          { hash: '0000_first', checksum: 'checksum-0' },
          { hash: '0001_second', checksum: 'checksum-1' },
        ],
        expected,
      ),
    ).toThrow('incomplete at 0002_third')
  })

  it('rejects a non-contiguous history', () => {
    expect(() =>
      assertMigrationHistoryReady(
        [
          { hash: '0000_first', checksum: 'checksum-0' },
          { hash: '0002_third', checksum: 'checksum-2' },
        ],
        expected,
      ),
    ).toThrow('not a contiguous prefix at 0002_third')
  })

  it('rejects a checksum mismatch', () => {
    expect(() =>
      assertMigrationHistoryReady(
        [
          { hash: '0000_first', checksum: 'checksum-0' },
          { hash: '0001_second', checksum: 'modified' },
          { hash: '0002_third', checksum: 'checksum-2' },
        ],
        expected,
      ),
    ).toThrow('checksum mismatch: 0001_second')
  })

  it('rejects a legacy row without a checksum', () => {
    expect(() =>
      assertMigrationHistoryReady(
        [
          { hash: '0000_first', checksum: null },
          { hash: '0001_second', checksum: 'checksum-1' },
          { hash: '0002_third', checksum: 'checksum-2' },
        ],
        expected,
      ),
    ).toThrow('checksum mismatch: 0000_first')
  })
})
