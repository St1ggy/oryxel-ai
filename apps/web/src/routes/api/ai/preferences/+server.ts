import { error, json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { getUserDefaultProvider, setUserDefaultProvider } from '$lib/server/ai/keys/service'
import { db } from '$lib/server/db'
import { userAiPreferences } from '$lib/server/db/schema'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  defaultProvider: z.enum(['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek']).optional(),
  minPyramidNotes: z.number().int().min(1).max(10).optional(),
  maxPyramidNotes: z.number().int().min(1).max(10).optional(),
  minRecommendations: z.number().int().min(1).max(30).optional(),
  maxRecommendations: z.number().int().min(1).max(30).optional(),
  tone: z.string().max(200).optional(),
  depth: z.string().max(200).optional(),
  rememberContext: z.boolean().optional(),
  graphStyle: z.enum(['default', 'constellation', 'bubble', 'ink', 'cluster', 'timeline']).optional(),
})

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const defaultProvider = await getUserDefaultProvider(locals.user.id)
  const [prefs] = await db
    .select({
      minPyramidNotes: userAiPreferences.minPyramidNotes,
      maxPyramidNotes: userAiPreferences.maxPyramidNotes,
      minRecommendations: userAiPreferences.minRecommendations,
      maxRecommendations: userAiPreferences.maxRecommendations,
      tone: userAiPreferences.tone,
      depth: userAiPreferences.depth,
      rememberContext: userAiPreferences.rememberContext,
      graphStyle: userAiPreferences.graphStyle,
    })
    .from(userAiPreferences)
    .where(eq(userAiPreferences.userId, locals.user.id))
    .limit(1)

  return json({
    defaultProvider,
    minPyramidNotes: prefs?.minPyramidNotes ?? 1,
    maxPyramidNotes: prefs?.maxPyramidNotes ?? 5,
    minRecommendations: prefs?.minRecommendations ?? 5,
    maxRecommendations: prefs?.maxRecommendations ?? 20,
    tone: prefs?.tone ?? null,
    depth: prefs?.depth ?? null,
    rememberContext: prefs?.rememberContext ?? true,
    graphStyle: prefs?.graphStyle ?? 'default',
  })
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = bodySchema.parse(await request.json())

  if (body.defaultProvider) {
    await setUserDefaultProvider(locals.user.id, body.defaultProvider)
  }

  const displayUpdates: Record<string, unknown> = {}

  if (body.minPyramidNotes !== undefined) displayUpdates['minPyramidNotes'] = body.minPyramidNotes

  if (body.maxPyramidNotes !== undefined) displayUpdates['maxPyramidNotes'] = body.maxPyramidNotes

  if (body.minRecommendations !== undefined) displayUpdates['minRecommendations'] = body.minRecommendations

  if (body.maxRecommendations !== undefined) displayUpdates['maxRecommendations'] = body.maxRecommendations

  if (body.tone !== undefined) displayUpdates['tone'] = body.tone

  if (body.depth !== undefined) displayUpdates['depth'] = body.depth

  if (body.rememberContext !== undefined) displayUpdates['rememberContext'] = body.rememberContext

  if (body.graphStyle !== undefined) displayUpdates['graphStyle'] = body.graphStyle

  if (Object.keys(displayUpdates).length > 0) {
    await db
      .insert(userAiPreferences)
      .values({ userId: locals.user.id, ...displayUpdates })
      .onConflictDoUpdate({
        target: userAiPreferences.userId,
        set: displayUpdates,
      })
  }

  return json({ ok: true })
}
