import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env['CATALOG_DATABASE_URL']

if (!databaseUrl) throw new Error('CATALOG_DATABASE_URL is not set')

const hostname = new URL(databaseUrl).hostname
const isPrivateHost =
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.railway.internal')

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
    ssl: isPrivateHost ? false : 'verify-full',
  },
  verbose: true,
  strict: true,
})
