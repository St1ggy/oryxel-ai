/* eslint-disable import-x/default -- package provides default export */
import st1ggySvelte from '@st1ggy/linter-config/eslint-svelte'
import { defineConfig } from 'eslint/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import svelteConfig from './svelte.config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @param {import('eslint').Linter.Config} config */
function omitParserProjectKey(config) {
  const parserOptions = config.languageOptions?.parserOptions

  if (!parserOptions || typeof parserOptions !== 'object' || !('project' in parserOptions)) {
    return config
  }

  const nextParserOptions = { ...parserOptions }

  delete nextParserOptions.project

  return {
    ...config,
    languageOptions: {
      ...config.languageOptions,
      parserOptions: nextParserOptions,
    },
  }
}

export default defineConfig([
  { ignores: ['src/lib/paraglide/**', 'src/paraglide/**', '.svelte-kit/**', 'build/**'] },
  ...st1ggySvelte.map((config) => omitParserProjectKey(config)),
  {
    languageOptions: {
      parserOptions: {
        allowDefaultProject: [
          '*.config.ts',
          '*.config.js',
          'eslint.config.js',
          'prettier.config.js',
          'stylelint.config.js',
          'svelte.config.js',
        ],
      },
    },
  },
  {
    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
        'eslint-import-resolver-custom-alias': {
          alias: {
            $lib: path.resolve(__dirname, 'src/lib'),
            $app: path.resolve(__dirname, 'node_modules/@sveltejs/kit/src/runtime/app'),
          },
          extensions: ['.js', '.ts', '.svelte'],
        },
      },
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'unicorn/require-module-specifiers': 'off',
    },
  },
  {
    // vite.config.ts uses @ts-nocheck to silence the vitest/vite dual-instance type conflict
    files: ['vite.config.ts', 'vite.config.js'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        svelteConfig,
      },
    },
    rules: {
      // SonarJS can crash on Svelte-extracted scripts (false offsets).
      'sonarjs/deprecation': 'off',
      // Svelte `$props()` destructuring is not a good fit for `prefer-const`.
      'prefer-const': 'off',
    },
  },
  {
    rules: {
      'import-x/no-unresolved': 'off',
      'import-x/extensions': 'off',
      // We use [...arr].reverse() for Node <20 compatibility (worker shares packages/ai).
      'unicorn/no-array-reverse': 'off',
      // sonarjs false positives: SvelteKit's onNavigate and runes() return mixed types by design;
      // includes() on string[] with a specific literal is valid TypeScript.
      'sonarjs/function-return-type': 'off',
      'sonarjs/argument-type': 'off',
    },
  },
  {
    files: ['src/lib/server/db/index.ts'],
    rules: {
      'unicorn/prevent-abbreviations': 'off',
    },
  },
  {
    files: ['src/lib/vitest-examples/**', 'e2e/**'],
    rules: {
      'unicorn/filename-case': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'import-x/extensions': 'off',
    },
  },
  {
    files: ['svelte.config.js'],
    rules: {
      'unicorn/import-style': 'off',
    },
  },
  {
    files: ['stylelint.config.js'],
    rules: {
      'import-x/default': 'off',
    },
  },
  {
    files: ['src/lib/server/diary/mock.ts', 'src/routes/+page.svelte', 'src/routes/diary/+page.svelte'],
    rules: {
      // `to_try` matches domain `FragranceListType`.
      camelcase: 'off',
    },
  },
  {
    files: ['src/lib/components/ui/button.svelte'],
    rules: {
      // `href` may be pre-localized via Paraglide (`localizeHref`).
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    files: ['src/lib/components/app/app-top-nav.svelte'],
    rules: {
      // `resolve()` is wrapped by `localizeHref()`; the rule does not detect it.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    files: ['src/lib/components/app/diary-header-controls.svelte'],
    rules: {
      // We navigate to localized href that is computed from current route + locale.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    files: ['src/routes/login/+page.svelte'],
    rules: {
      // Login intent links are built via localized helper function.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    files: ['src/routes/settings/+layout.svelte'],
    rules: {
      // Tab hrefs are pre-localized via Paraglide `resolve()`.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    files: ['src/routes/+page.svelte', 'src/lib/components/app/landing-nav.svelte'],
    rules: {
      // Landing page contains both internal localized links and external absolute URLs.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    files: ['src/lib/components/icons/*.svelte'],
    rules: {
      // Icon components are kept in PascalCase to match Svelte component imports.
      'unicorn/filename-case': 'off',
    },
  },
  {
    files: ['src/lib/locale.svelte.ts'],
    rules: {
      // Paraglide runtime module cannot be statically resolved by the import plugin.
      'import-x/namespace': 'off',
    },
  },
  {
    files: ['scripts/**'],
    rules: {
      // Seed scripts intentionally use console output.
      'no-console': 'off',
    },
  },
  {
    rules: {
      // v5 shared config enables this; type-aware setup is inconsistent for config/e2e/tooling paths with projectService.
      '@typescript-eslint/switch-exhaustiveness-check': 'off',
    },
  },
])
