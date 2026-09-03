/* eslint-disable import-x/default -- package provides default export */
import commonConfig from '@st1ggy/linter-config/eslint-common'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  { ignores: ['eslint.config.js', 'prettier.config.js', 'drizzle.config.ts'] },
  ...commonConfig,
  {
    rules: {
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
    },
  },
  {
    files: ['src/index.ts'],
    rules: {
      // `db` is the conventional Drizzle client export name.
      'unicorn/prevent-abbreviations': 'off',
    },
  },
  {
    files: ['src/check-migrations.ts', 'src/migrate.ts', 'src/migrations.ts', 'src/verify-migration.ts'],
    rules: {
      // CLI scripts — console output and process.exit() are intentional.
      'no-console': 'off',
      // The package targets ES2022, which does not provide Array.prototype.toSorted().
      'unicorn/no-array-sort': 'off',
      'unicorn/no-process-exit': 'off',
    },
  },
])
