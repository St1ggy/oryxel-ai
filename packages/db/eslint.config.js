/* eslint-disable import/default -- package provides default export */
import commonConfig from '@st1ggy/linter-config/eslint-common'
import { defineConfig } from 'eslint/config'

export default defineConfig([
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
    files: ['src/migrate.ts'],
    rules: {
      // Migration runner is a CLI script — console output and process.exit() are intentional.
      'no-console': 'off',
      'unicorn/no-process-exit': 'off',
    },
  },
])
