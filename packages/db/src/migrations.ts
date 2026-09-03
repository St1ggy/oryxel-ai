import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'

export { migrationManifest } from './migration-manifest'

const currentDirectory = nodePath.dirname(fileURLToPath(import.meta.url))

export const migrationsDirectory = nodePath.join(currentDirectory, '../drizzle')

export type MigrationFile = {
  checksum: string
  file: string
  sql: string
  tag: string
}

export function loadMigrations(): MigrationFile[] {
  return readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => {
      const sql = readFileSync(nodePath.join(migrationsDirectory, file), 'utf8')

      return {
        checksum: createHash('sha256').update(sql).digest('hex'),
        file,
        sql,
        tag: file.replace(/\.sql$/, ''),
      }
    })
}
