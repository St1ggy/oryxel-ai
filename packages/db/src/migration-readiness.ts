import { migrationManifest } from './migration-manifest'

import type { MigrationManifestEntry } from './migration-manifest'

export type AppliedMigration = {
  checksum: string | null
  hash: string
}

export function assertMigrationHistoryReady(
  appliedMigrations: AppliedMigration[],
  expectedMigrations: readonly MigrationManifestEntry[] = migrationManifest,
) {
  const expectedByTag = new Map(expectedMigrations.map((migration) => [migration.tag, migration]))
  const appliedByTag = new Map(appliedMigrations.map((migration) => [migration.hash, migration]))

  if (appliedByTag.size !== appliedMigrations.length) throw new Error('Database migration history contains duplicates')

  for (const migration of appliedMigrations) {
    if (!expectedByTag.has(migration.hash)) {
      throw new Error(`Database contains an unknown migration: ${migration.hash}`)
    }
  }

  let missingTag: string | undefined

  for (const expected of expectedMigrations) {
    const applied = appliedByTag.get(expected.tag)

    if (!applied) {
      missingTag ??= expected.tag
      continue
    }

    if (missingTag) {
      throw new Error(`Database migration history is not a contiguous prefix at ${expected.tag}`)
    }

    if (applied.checksum !== expected.checksum) {
      throw new Error(`Database migration checksum mismatch: ${expected.tag}`)
    }
  }

  if (missingTag) throw new Error(`Database migration history is incomplete at ${missingTag}`)
}
