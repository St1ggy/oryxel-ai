import type { AnalyzePreferencesRequest } from './contracts'

/** Fixed sample for settings UI — same structure as live prompts; not sent to providers. */
export function createPromptPreviewSampleRequest(input: {
  locale: string
  scenario: AnalyzePreferencesRequest['scenario']
  minPyramidNotes: number
  maxPyramidNotes: number
  minRecommendations: number
  maxRecommendations: number
  tone?: string | null
  depth?: string | null
}): AnalyzePreferencesRequest {
  return {
    userId: 'preview',
    message: '[sample user message]',
    locale: input.locale,
    scenario: input.scenario,
    allowAgentMemoryOps: true,
    recommendationsOnly: false,
    minPyramidNotes: input.minPyramidNotes,
    maxPyramidNotes: input.maxPyramidNotes,
    minRecommendations: input.minRecommendations,
    maxRecommendations: input.maxRecommendations,
    tone: input.tone ?? undefined,
    depth: input.depth ?? undefined,
    context: {
      profile: {
        displayName: 'Preview',
        bio: 'Sample bio text for prompt preview.',
        preferences: 'Sample preferences line.',
        gender: 'female',
      },
      diary: {
        to_try: [],
        liked: [
          {
            id: 1,
            brand: 'Preview Brand',
            fragrance: 'Sample Fragrance',
            notes: 'citrus, musk',
            pyramidTop: 'bergamot',
            pyramidMid: 'rose',
            pyramidBase: 'sandalwood',
            rating: 4,
          },
        ],
        neutral: [],
        disliked: [],
        owned: [],
      },
      budget: undefined,
      recentMessages: [{ role: 'user', content: 'Earlier message (preview).' }],
      agentMemoryEntries: undefined,
    },
  }
}
