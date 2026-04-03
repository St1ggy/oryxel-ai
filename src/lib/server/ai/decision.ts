import type { StructuredPreferencePatch } from './contracts'

function hasLocaleMap(val: Record<string, string> | undefined): boolean {
  return val != null && Object.keys(val).length > 0
}

export function isCriticalPatch(patch: StructuredPreferencePatch): boolean {
  if (
    hasLocaleMap(patch.profile?.archetype) ||
    hasLocaleMap(patch.profile?.favoriteNote) ||
    (patch.profile?.radar != null && Object.keys(patch.profile.radar).length > 0)
  ) {
    return true
  }

  if (patch.tableOps.some((op) => op.op === 'remove' || op.op === 'move')) {
    return true
  }

  return false
}
