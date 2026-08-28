import prettierSvelte from '@st1ggy/linter-config/prettier-svelte'

export default {
  ...prettierSvelte,
  plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/routes/layout.css',
}
