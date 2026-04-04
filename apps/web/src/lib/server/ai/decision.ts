import type { StructuredPreferencePatch } from './contracts'

export function isCriticalPatch(patch: StructuredPreferencePatch): boolean {
  if (
    patch.profile?.archetype != null ||
    patch.profile?.favoriteNote != null ||
    (patch.profile?.radar != null && Object.keys(patch.profile.radar).length > 0)
  ) {
    return true
  }

  if (patch.tableOps.some((op) => op.op === 'remove' || op.op === 'move')) {
    return true
  }

  return false
}
