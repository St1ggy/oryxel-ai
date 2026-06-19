import { searchFragrances } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'

import '$lib/server/db'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const q = url.searchParams.get('q') ?? ''
  const limit = Number(url.searchParams.get('limit') ?? '20')
  const results = await searchFragrances(q, Number.isFinite(limit) ? limit : 20)

  return json({ results })
}
