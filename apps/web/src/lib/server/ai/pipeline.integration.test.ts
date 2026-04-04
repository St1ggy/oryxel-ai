import { describe, expect, it } from 'vitest'

import { isCriticalPatch } from './decision'
import { getAiRouterPolicy } from './policy'
import { analyzePreferencesRequestSchema, structuredPreferencePatchSchema } from './schemas'

describe('ai pipeline integration', () => {
  it('parses request and patch contracts with critical classification', () => {
    const request = analyzePreferencesRequestSchema.parse({
      userId: 'u1',
      message: 'Please update my profile and move Noir Papyrus to liked',
      locale: 'en',
    })

    const patch = structuredPreferencePatchSchema.parse({
      confidence: 0.91,
      summary: 'Profile and table update',
      profile: {
        archetype: 'Explorer',
        favoriteNote: 'iris',
      },
      tableOps: [{ op: 'move', rowId: 5, listType: 'liked' }],
    })

    expect(request.userId).toBe('u1')
    expect(isCriticalPatch(patch)).toBe(true)
  })

  it('provides fallback policy defaults', () => {
    const policy = getAiRouterPolicy()

    expect(policy.timeoutMs).toBeGreaterThan(0)
    expect(policy.providerOrder.length).toBeGreaterThan(0)
    expect(policy.maxAttemptsTotal).toBeGreaterThanOrEqual(1)
  })
})
