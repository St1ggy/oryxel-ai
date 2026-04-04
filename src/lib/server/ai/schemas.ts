import { z } from 'zod'

const radarSchema = z.record(z.string().min(1).max(40), z.number().int().min(0).max(100))

const profileContextSchema = z.object({
  displayName: z.string().max(120).optional(),
  bio: z.string().max(600).optional(),
  preferences: z.string().max(2000).optional(),
  archetype: z.string().max(120).optional(),
  favoriteNote: z.string().max(120).optional(),
  radar: radarSchema.optional(),
  gender: z.enum(['male', 'female']).nullable().optional(),
  noteRelationships: z
    .array(
      z.object({
        note: z.string().max(80),
        sentiment: z.enum(['love', 'like', 'neutral', 'dislike', 'redflag']),
        label: z.string().max(200),
      }),
    )
    .optional(),
})

const diaryEntryContextSchema = z.object({
  id: z.number().int(),
  brand: z.string().max(120),
  fragrance: z.string().max(120),
  notes: z.string().max(400).nullable().optional(),
  pyramidTop: z.string().max(300).nullable().optional(),
  pyramidMid: z.string().max(300).nullable().optional(),
  pyramidBase: z.string().max(300).nullable().optional(),
})

const diaryContextSchema = z.object({
  // eslint-disable-next-line camelcase
  to_try: z.array(diaryEntryContextSchema).optional(),
  liked: z.array(diaryEntryContextSchema).optional(),
  neutral: z.array(diaryEntryContextSchema).optional(),
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
  minRecommendations: z.number().int().min(1).max(30).optional(),
  maxRecommendations: z.number().int().min(1).max(30).optional(),
  maxPyramidNotes: z.number().int().min(1).max(10).optional(),
  tone: z.string().max(200).optional(),
  depth: z.string().max(200).optional(),
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
  // Flags for op=add / op=move (replaces listType)
  isOwned: z.boolean().optional(),
  isTried: z.boolean().optional(),
  isLiked: z.boolean().nullable().optional(),
  rating: z.number().int().min(0).max(5).optional(),
  agentComment: z.string().max(80).optional(),
  userComment: z.string().max(200).nullable().optional(),
  season: z.string().max(60).optional(),
  timeOfDay: z.string().max(40).optional(),
  gender: z.enum(['female', 'male', 'unisex']).optional(),
})

export const structuredPreferencePatchSchema = z.object({
  reply: z.string().max(800).optional(),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(400),
  profile: z
    .object({
      archetype: z.string().max(120).optional(),
      favoriteNote: z.string().max(120).optional(),
      radar: radarSchema.optional(),
      radarLabels: z.record(z.string().min(1).max(40), z.string().max(60)).optional(),
      preferences: z.string().max(2000).optional(),
      rationale: z.string().min(1).max(800).optional(),
      noteRelationships: z
        .array(
          z.object({
            note: z.string().max(80),
            sentiment: z.enum(['love', 'like', 'neutral', 'dislike', 'redflag']),
            label: z.string().max(200),
          }),
        )
        .max(30)
        .optional(),
    })
    .nullish(),
  tableOps: z.array(tableOperationSchema).max(150).default([]),
  recommendations: z
    .array(
      z.object({
        id: z.string(),
        brand: z.string().max(120),
        name: z.string().max(120),
        notesSummary: z.string().max(400).optional(),
        pyramidTop: z.string().max(300).nullable().optional(),
        pyramidMid: z.string().max(300).nullable().optional(),
        pyramidBase: z.string().max(300).nullable().optional(),
        tag: z.string().max(120),
      }),
    )
    .max(30)
    .nullish(),
  suggestions: z.array(z.string().max(200)).max(5).nullish(),
})
