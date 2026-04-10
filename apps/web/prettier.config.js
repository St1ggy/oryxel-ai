/* eslint-disable import-x/default -- package provides default export */
import prettierSvelte from '@st1ggy/linter-config/prettier-svelte'

/** @type {import('prettier').Config} */
export default {
  ...prettierSvelte,
  plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/routes/layout.css',
}
