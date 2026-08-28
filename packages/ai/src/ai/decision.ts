import type { StructuredPreferencePatch, TableOperation } from './contracts.js'
import type { ChatAgentMode } from '../types/chat-mode.js'

//
// Strip everything except reply/summary/confidence/recommendations — used when the user only asked to refresh AI picks.
//
export function sanitizePatchToRecommendationsOnly(patch: StructuredPreferencePatch) {
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

export function isCriticalPatch(patch: StructuredPreferencePatch) {
  return (
    patch.tableOps.some((op: TableOperation) => op.op === 'remove') ||
    patch.agentMemoryOps?.some((op) => op.op === 'remove') === true ||
    patch.listOps?.some((op) => op.op === 'remove') === true
  )
}

function countPatchMutations(patch: StructuredPreferencePatch) {
  let count = patch.tableOps.length

  if (patch.profile != null) count += 1

  if (patch.suggestions != null && patch.suggestions.length > 0) count += 1

  if (patch.recommendations != null && patch.recommendations.length > 0) count += 1

  if (patch.agentMemoryOps != null && patch.agentMemoryOps.length > 0) count += patch.agentMemoryOps.length

  if (patch.listOps != null && patch.listOps.length > 0) count += patch.listOps.length

  return count
}

export function sanitizePatchForChatMode(patch: StructuredPreferencePatch, mode: ChatAgentMode) {
  switch (mode) {
    case 'ask': {
      return {
        confidence: patch.confidence,
        summary: patch.summary,
        reply: patch.reply,
        tableOps: [],
      }
    }

    case 'add': {
      return {
        confidence: patch.confidence,
        summary: patch.summary,
        reply: patch.reply,
        tableOps: patch.tableOps.filter((op: TableOperation) => op.op === 'add'),
        recommendations: patch.recommendations ?? undefined,
      }
    }

    case 'recommend': {
      return sanitizePatchToRecommendationsOnly(patch)
    }

    case 'curate': {
      return {
        confidence: patch.confidence,
        summary: patch.summary,
        reply: patch.reply,
        tableOps: [],
        listOps: patch.listOps ?? undefined,
      }
    }

    case 'agent': {
      return patch
    }
  }
}

export function countStrippedPatchMutations(original: StructuredPreferencePatch, sanitized: StructuredPreferencePatch) {
  return Math.max(0, countPatchMutations(original) - countPatchMutations(sanitized))
}
