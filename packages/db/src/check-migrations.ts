import { existsSync, readFileSync } from 'node:fs'
import nodePath from 'node:path'

import { loadMigrations, migrationsDirectory } from './migrations'

type Journal = {
  entries: { idx: number; tag: string }[]
}

const metaDirectory = nodePath.join(migrationsDirectory, 'meta')
const journal = JSON.parse(readFileSync(nodePath.join(metaDirectory, '_journal.json'), 'utf8')) as Journal
const checksums = JSON.parse(readFileSync(nodePath.join(migrationsDirectory, 'checksums.json'), 'utf8')) as Record<
  string,
  string
>
const migrations = loadMigrations()

if (journal.entries.length !== migrations.length) {
  throw new Error(`Migration journal has ${journal.entries.length} entries but ${migrations.length} SQL files exist`)
}

if (Object.keys(checksums).length !== migrations.length) {
  throw new Error(
    `Checksum manifest has ${Object.keys(checksums).length} entries but ${migrations.length} SQL files exist`,
  )
}

for (const [index, migration] of migrations.entries()) {
  const journalEntry = journal.entries[index]

  if (journalEntry?.idx !== index || journalEntry.tag !== migration.tag) {
    throw new Error(`Migration order mismatch at index ${index}: expected ${migration.tag}`)
  }

  if (checksums[migration.tag] !== migration.checksum) {
    throw new Error(`Migration checksum mismatch: ${migration.file}`)
  }
}

const latestIndex = migrations.length - 1
const latestSnapshot = nodePath.join(metaDirectory, `${String(latestIndex).padStart(4, '0')}_snapshot.json`)

if (!existsSync(latestSnapshot)) {
  throw new Error(`Latest migration snapshot is missing: ${nodePath.basename(latestSnapshot)}`)
}

console.log(`Migration history verified: ${migrations.length} immutable SQL files`)
