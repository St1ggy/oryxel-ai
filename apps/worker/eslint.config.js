/* eslint-disable import-x/default -- package provides default export */
import commonConfig from '@st1ggy/linter-config/eslint-common'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  { ignores: ['eslint.config.js', 'prettier.config.js'] },
  ...commonConfig,
  {
    rules: {
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      // Worker is a Node.js background service — console logging is expected.
      'no-console': 'off',
      // Fire-and-forget void calls are intentional in background processing.
      'sonarjs/void-use': 'off',
    },
  },
  {
    files: ['src/handlers/**'],
    rules: {
      // `to_try` matches domain FragranceListType (DB column name).
      camelcase: 'off',
    },
  },
])
