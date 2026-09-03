import checksums from '../drizzle/checksums.json'
import journal from '../drizzle/meta/_journal.json'

export type MigrationManifestEntry = {
  checksum: string
  tag: string
}

const checksumByTag = checksums as Record<string, string>

export const migrationManifest: readonly MigrationManifestEntry[] = journal.entries.map(({ tag }) => ({
  checksum: checksumByTag[tag] ?? '',
  tag,
}))
