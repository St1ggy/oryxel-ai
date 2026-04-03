import stylelintScss from '@st1ggy/linter-config/stylelint-scss'

const base = /** @type {import('stylelint').Config} */ (/** @type {unknown} */ (stylelintScss))

/** Tailwind CSS v4 / Vite — at-rules вне обычного CSS */
const tailwindAtRules = [
  'tailwind',
  'apply',
  'layer',
  'theme',
  'plugin',
  'config',
  'reference',
  'source',
  'utility',
  'variant',
  'custom-variant',
  'starting-style',
]

/** @type {import('stylelint').Config} */
export default {
  ...base,
  ignoreFiles: [...(base.ignoreFiles ?? []), 'node_modules/**', '.svelte-kit/**', 'build/**', 'dist/**'],
  rules: {
    ...base.rules,
    'at-rule-no-unknown': [true, { ignoreAtRules: tailwindAtRules }],
    'scss/at-rule-no-unknown': [true, { ignoreAtRules: tailwindAtRules }],
    'color-hex-length': null,
    'order/properties-order': null,
    'prettier/prettier': null,
    'plugin/no-unsupported-browser-features': null,
  },
}
