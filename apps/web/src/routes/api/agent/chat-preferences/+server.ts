import { chatAgentModeSchema } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { setUserDefaultProvider } from '$lib/server/ai/keys/service'
import { db } from '$lib/server/db'
import { userAiPreferences } from '$lib/server/db/schema'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  chatMode: chatAgentModeSchema.optional(),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek']).optional(),
  modelId: z.string().max(80).optional().nullable(),
})

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = bodySchema.parse(await request.json())
  const userId = locals.user.id

  if (body.provider) {
    await setUserDefaultProvider(userId, body.provider)
  }

  const updates: Record<string, unknown> = {}

  if (body.chatMode !== undefined) {
    updates['defaultChatMode'] = body.chatMode
  }

  if (body.modelId !== undefined) {
    updates['defaultModelId'] = body.modelId === '' ? null : body.modelId
  }

  if (Object.keys(updates).length > 0) {
    await db
      .insert(userAiPreferences)
      .values({ userId, ...updates })
      .onConflictDoUpdate({
        target: userAiPreferences.userId,
        set: updates,
      })
  }

  return json({ ok: true })
}
