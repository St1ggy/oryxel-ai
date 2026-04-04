import type { StructuredPreferencePatch } from './contracts'

// A patch is critical only when the agent proposes to delete 3 or more entries at once.
// Anything else (profile updates, moves, single removes, adds, ratings) applies automatically.
//
// Rationale: the diary is easily corrected, so we only gate bulk destructive operations that
// the user likely did not intend (e.g. "clear my disliked list" removing 10 items at once).
export function isCriticalPatch(patch: StructuredPreferencePatch): boolean {
  const removeCount = patch.tableOps.filter((op) => op.op === 'remove').length

  return removeCount >= 3
}
