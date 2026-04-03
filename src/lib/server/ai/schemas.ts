import { z } from 'zod'

const radarSchema = z.record(z.string().min(1).max(40), z.number().int().min(0).max(100))

const profileContextSchema = z.object({
  displayName: z.string().max(120).optional(),
  bio: z.string().max(600).optional(),
  archetype: z.string().max(120).optional(),
  favoriteNote: z.string().max(120).optional(),
  radar: radarSchema.optional(),
})

const diaryEntryContextSchema = z.object({
  id: z.number().int(),
  brand: z.string().max(120),
  fragrance: z.string().max(120),
  pyramidTop: z.string().max(300).nullable().optional(),
  pyramidMid: z.string().max(300).nullable().optional(),
  pyramidBase: z.string().max(300).nullable().optional(),
})

const diaryContextSchema = z.object({
  // eslint-disable-next-line camelcase
  to_try: z.array(diaryEntryContextSchema).optional(),
  liked: z.array(diaryEntryContextSchema).optional(),
  disliked: z.array(diaryEntryContextSchema).optional(),
  owned: z.array(diaryEntryContextSchema).optional(),
})

const recentMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(400),
})

const contextSchema = z.object({
  profile: profileContextSchema.optional(),
  diary: diaryContextSchema.optional(),
  budget: z.string().max(120).optional(),
  recentMessages: z.array(recentMessageSchema).max(10).optional(),
})

export const analyzePreferencesRequestSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
  locale: z.string().min(2).max(10).default('en'),
  scenario: z
    .enum(['analog', 'pyramid', 'recommendation', 'comparison', 'command', 'profile_sync'])
    .default('recommendation'),
  preferredProvider: z.enum(['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek']).optional(),
  context: contextSchema.optional(),
})

export const tableOperationSchema = z.object({
  op: z.enum(['add', 'move', 'rate', 'status', 'remove']),
  rowId: z.number().int().positive().optional(),
  fragranceId: z.number().int().positive().optional(),
  brandName: z.string().max(120).optional(),
  fragranceName: z.string().max(120).optional(),
  notesSummary: z.string().max(400).optional(),
  pyramidTop: z.string().max(300).nullable().optional(),
  pyramidMid: z.string().max(300).nullable().optional(),
  pyramidBase: z.string().max(300).nullable().optional(),
  listType: z.enum(['to_try', 'liked', 'disliked', 'owned']).optional(),
  rating: z.number().int().min(0).max(5).optional(),
  statusLabel: z.string().max(64).optional(),
  isOwned: z.boolean().optional(),
})

export const structuredPreferencePatchSchema = z.object({
  reply: z.string().max(800).optional(),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(400),
  profile: z
    .object({
      archetype: z.record(z.string(), z.string().max(100)).optional(),
      favoriteNote: z.record(z.string(), z.string().max(100)).optional(),
      radar: radarSchema.optional(),
      radarLabels: z
        .preprocess(
          (value) => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return value

            const locales = new Set(['en', 'es', 'fr', 'jp', 'ru', 'zh'])
            const outer = value as Record<string, unknown>
            const outerKeys = Object.keys(outer)

            // Detect inverted format: outer keys are locales → { locale: { axisKey: label } }
            if (outerKeys.length > 0 && outerKeys.every((k) => locales.has(k))) {
              const result: Record<string, Record<string, string>> = {}

              for (const [locale, axisMap] of Object.entries(outer)) {
                if (!axisMap || typeof axisMap !== 'object' || Array.isArray(axisMap)) continue

                for (const [axisKey, label] of Object.entries(axisMap as Record<string, unknown>)) {
                  if (!result[axisKey]) result[axisKey] = {}

                  result[axisKey][locale] = String(label)
                }
              }

              return result
            }

            return value
          },
          z.record(z.string().min(1).max(40), z.record(z.string(), z.string().max(40))),
        )
        .optional(),
      rationale: z.string().min(1).max(800).optional(),
    })
    .nullish(),
  tableOps: z.array(tableOperationSchema).max(30).default([]),
  recommendations: z
    .array(
      z.object({
        id: z.string(),
        brand: z.string().max(120),
        name: z.string().max(120),
        tag: z.record(z.string(), z.string().max(120)),
      }),
    )
    .max(12)
    .nullish(),
  suggestions: z
    .array(z.record(z.string(), z.string().max(120)))
    .max(5)
    .nullish(),
})
