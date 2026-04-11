import {
  buildPromptSections,
  buildPromptWithOptions,
  createPromptPreviewSampleRequest,
  estimatePromptTokensApprox,
} from '@oryxel/ai'
import { error, json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '$lib/server/db'
import { userAiPreferences } from '$lib/server/db/schema'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  locale: z.string().min(2).max(10).optional(),
  scenario: z.enum(['analog', 'pyramid', 'recommendation', 'comparison', 'command', 'profile_sync']).optional(),
  minPyramidNotes: z.number().int().min(1).max(10).optional(),
  maxPyramidNotes: z.number().int().min(1).max(10).optional(),
  minRecommendations: z.number().int().min(1).max(30).optional(),
  maxRecommendations: z.number().int().min(1).max(30).optional(),
  tone: z.string().max(200).optional().nullable(),
  depth: z.string().max(200).optional().nullable(),
  systemPromptMode: z.enum(['default', 'append', 'replace']).optional(),
  systemPromptAppend: z.string().max(16_000).optional().nullable(),
  systemPromptReplace: z.string().max(32_000).optional().nullable(),
})

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const raw = bodySchema.parse(await request.json())

  const [prefs] = await db
    .select({
      minPyramidNotes: userAiPreferences.minPyramidNotes,
      maxPyramidNotes: userAiPreferences.maxPyramidNotes,
      minRecommendations: userAiPreferences.minRecommendations,
      maxRecommendations: userAiPreferences.maxRecommendations,
      tone: userAiPreferences.tone,
      depth: userAiPreferences.depth,
      systemPromptMode: userAiPreferences.systemPromptMode,
      systemPromptAppend: userAiPreferences.systemPromptAppend,
      systemPromptReplace: userAiPreferences.systemPromptReplace,
    })
    .from(userAiPreferences)
    .where(eq(userAiPreferences.userId, locals.user.id))
    .limit(1)

  const minP = raw.minPyramidNotes ?? prefs?.minPyramidNotes ?? 1
  const maxP = raw.maxPyramidNotes ?? prefs?.maxPyramidNotes ?? 5
  const minR = raw.minRecommendations ?? prefs?.minRecommendations ?? 5
  const maxR = raw.maxRecommendations ?? prefs?.maxRecommendations ?? 20
  const locale = raw.locale ?? 'en'
  const scenario = raw.scenario ?? 'command'
  const tone = raw.tone === undefined ? (prefs?.tone ?? null) : raw.tone
  const depth = raw.depth === undefined ? (prefs?.depth ?? null) : raw.depth
  const mode = raw.systemPromptMode ?? (prefs?.systemPromptMode as 'default' | 'append' | 'replace' | null) ?? 'default'
  const append = raw.systemPromptAppend === undefined ? (prefs?.systemPromptAppend ?? null) : raw.systemPromptAppend
  const replace = raw.systemPromptReplace === undefined ? (prefs?.systemPromptReplace ?? null) : raw.systemPromptReplace

  const sample = createPromptPreviewSampleRequest({
    locale,
    scenario,
    minPyramidNotes: minP,
    maxPyramidNotes: maxP,
    minRecommendations: minR,
    maxRecommendations: maxR,
    tone,
    depth,
  })

  const sections = buildPromptSections(sample).map((section) => ({
    key: section.key,
    label: section.label,
    chars: section.content.length,
    tokensApprox: estimatePromptTokensApprox(section.content),
    content: section.content,
  }))

  const builtinFull = buildPromptWithOptions(sample, { mode: 'default' })
  const resolvedFull = buildPromptWithOptions(sample, {
    mode,
    append,
    replace,
  })

  return json({
    scenario,
    locale,
    mode,
    sections,
    builtinFull,
    resolvedFull,
    totalCharsResolved: resolvedFull.length,
    totalTokensApproxResolved: estimatePromptTokensApprox(resolvedFull),
    totalCharsBuiltin: builtinFull.length,
    totalTokensApproxBuiltin: estimatePromptTokensApprox(builtinFull),
  })
}
