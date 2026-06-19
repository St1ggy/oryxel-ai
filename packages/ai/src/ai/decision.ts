import type { ChatAgentMode } from '../types/chat-mode'

import type { StructuredPreferencePatch } from './contracts'

/** Strip everything except reply/summary/confidence/recommendations — used when the user only asked to refresh AI picks. */
export function sanitizePatchToRecommendationsOnly(patch: StructuredPreferencePatch): StructuredPreferencePatch {
  return {
    confidence: patch.confidence,
    summary: patch.summary,
    reply: patch.reply,
    recommendations: patch.recommendations ?? undefined,
    tableOps: [],
    profile: undefined,
    suggestions: undefined,
    agentMemoryOps: undefined,
  }
}

// A patch is critical only when the agent proposes to delete 3 or more entries at once.
// Anything else (profile updates, moves, single removes, adds, ratings) applies automatically.
//
// Rationale: the diary is easily corrected, so we only gate bulk destructive operations that
// the user likely did not intend (e.g. "clear my disliked list" removing 10 items at once).
export function isCriticalPatch(patch: StructuredPreferencePatch): boolean {
  const removeCount = patch.tableOps.filter((op) => op.op === 'remove').length

  return removeCount >= 3
}

function countPatchMutations(patch: StructuredPreferencePatch): number {
  let count = patch.tableOps.length

  if (patch.profile != null) count += 1
  if (patch.suggestions != null && patch.suggestions.length > 0) count += 1
  if (patch.recommendations != null && patch.recommendations.length > 0) count += 1
  if (patch.agentMemoryOps != null && patch.agentMemoryOps.length > 0) count += patch.agentMemoryOps.length

  return count
}

export function sanitizePatchForChatMode(
  patch: StructuredPreferencePatch,
  mode: ChatAgentMode,
): StructuredPreferencePatch {
  switch (mode) {
    case 'ask':
      return {
        confidence: patch.confidence,
        summary: patch.summary,
        reply: patch.reply,
        tableOps: [],
      }
    case 'add':
      return {
        confidence: patch.confidence,
        summary: patch.summary,
        reply: patch.reply,
        tableOps: patch.tableOps.filter((op) => op.op === 'add'),
        recommendations: patch.recommendations ?? undefined,
      }
    case 'recommend':
      return sanitizePatchToRecommendationsOnly(patch)
    case 'agent':
      return patch
  }
}

export function countStrippedPatchMutations(
  original: StructuredPreferencePatch,
  sanitized: StructuredPreferencePatch,
): number {
  return Math.max(0, countPatchMutations(original) - countPatchMutations(sanitized))
}
