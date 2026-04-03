import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { getUserDefaultProvider, setUserDefaultProvider } from '$lib/server/ai/keys/service'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  defaultProvider: z.enum(['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek']),
})

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const defaultProvider = await getUserDefaultProvider(locals.user.id)

  return json({ defaultProvider })
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = bodySchema.parse(await request.json())

  await setUserDefaultProvider(locals.user.id, body.defaultProvider)

  return json({ ok: true })
}
