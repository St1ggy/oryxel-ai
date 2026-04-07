/* eslint-disable import/default -- package provides default export */
import commonConfig from '@st1ggy/linter-config/eslint-common'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  { ignores: ['eslint.config.js', 'prettier.config.js'] },
  ...commonConfig,
  {
    rules: {
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'no-console': 'off',
      'sonarjs/void-use': 'off',
    },
  },
])
