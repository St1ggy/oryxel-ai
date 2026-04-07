import type { StructuredPreferencePatch } from './contracts'

export type PatchDisplayLimits = {
  minPyramidNotes: number
  maxPyramidNotes: number
  minRecommendations: number
  maxRecommendations: number
}

function countTierNotes(value: string | null | undefined): number {
  if (value == null || value.trim() === '') {
    return 0
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean).length
}

/** Returns human-readable violation messages (empty if patch is within limits). */
/* eslint-disable sonarjs/cognitive-complexity -- branchy validation kept explicit for auditability */
export function getPatchDisplayLimitViolations(
  patch: StructuredPreferencePatch,
  input: {
    scenario: string
    limits: Partial<PatchDisplayLimits>
  },
): string[] {
  const violations: string[] = []
  const minP = input.limits.minPyramidNotes ?? 1
  const maxP = input.limits.maxPyramidNotes ?? 5
  const minR = input.limits.minRecommendations ?? 1
  const maxR = input.limits.maxRecommendations ?? 30

  if (patch.recommendations && patch.recommendations.length > 0) {
    const count = patch.recommendations.length

    if (input.scenario === 'recommendation' && (count < minR || count > maxR)) {
      violations.push(`recommendations: count ${count} not in [${minR}, ${maxR}]`)
    }

    for (const rec of patch.recommendations) {
      for (const field of ['pyramidTop', 'pyramidMid', 'pyramidBase'] as const) {
        const raw = rec[field]
        const tierCount = countTierNotes(raw ?? undefined)

        if (tierCount === 0) {
          continue
        }

        if (tierCount < minP || tierCount > maxP) {
          violations.push(`recommendation ${rec.id} (${field}): ${tierCount} notes not in [${minP}, ${maxP}]`)
        }
      }
    }
  }

  for (const op of patch.tableOps) {
    for (const field of ['pyramidTop', 'pyramidMid', 'pyramidBase'] as const) {
      const raw = op[field]
      const tierCount = countTierNotes(raw ?? undefined)

      if (tierCount === 0) {
        continue
      }

      if (tierCount < minP || tierCount > maxP) {
        violations.push(`tableOp ${op.op} (${field}): ${tierCount} notes not in [${minP}, ${maxP}]`)
      }
    }
  }

  return violations
}
/* eslint-enable sonarjs/cognitive-complexity */

export function warnIfPatchViolatesDisplayLimits(
  patch: StructuredPreferencePatch,
  input: { scenario: string; limits: Partial<PatchDisplayLimits>; userId?: string },
): void {
  const violations = getPatchDisplayLimitViolations(patch, input)

  if (violations.length === 0) {
    return
  }

  console.warn('[ai-display-limits] Patch outside user display limits', {
    userId: input.userId,
    scenario: input.scenario,
    violations,
  })
}
