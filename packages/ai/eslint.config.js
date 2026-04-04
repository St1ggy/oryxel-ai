/* eslint-disable import/default -- package provides default export */
import commonConfig from '@st1ggy/linter-config/eslint-common'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  ...commonConfig,
  {
    rules: {
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      // Server-side package — console logging is expected.
      'no-console': 'off',
      // Node <20 compat: uses [...arr].reverse() instead of toReversed().
      'unicorn/no-array-reverse': 'off',
    },
  },
  {
    files: ['src/diary/**', 'src/ai/jobs.ts', 'src/ai/apply.ts', 'src/ai/router.ts'],
    rules: {
      // `to_try` matches domain FragranceListType (DB column name).
      camelcase: 'off',
    },
  },
  {
    files: ['src/ai/providers/openai.ts', 'src/ai/providers/anthropic.ts'],
    rules: {
      // Upstream API payload uses snake_case keys.
      camelcase: 'off',
    },
  },
  {
    files: ['src/diary/load.ts'],
    rules: {
      // Parsing logic has inherent branching; complexity is acceptable here.
      'sonarjs/cognitive-complexity': 'off',
    },
  },
])
