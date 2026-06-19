import { aiRecommendationDismissed, db, fragrance, userAgentMemory, userFragrance, userProfile } from '@oryxel/db'
import { and, count, eq } from 'drizzle-orm'

import { findOrCreateBrand, findOrCreateFragrance } from '../diary/find-or-create'

import { AGENT_MEMORY_MAX_ROWS } from './agent-memory'

import type { AgentMemoryOp, StructuredPreferencePatch, TableOperation } from './contracts'
import type { NoteRelationship } from '../types/diary'

type DatabaseExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

// Merges incoming agent noteRelationships with the currently stored ones,
// preserving any entry the user has manually locked (`lockedByUser: true`).
async function mergeNoteRelationships(userId: string, incoming: NoteRelationship[]) {
  const [row] = await db
    .select({ noteRelationships: userProfile.noteRelationships })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1)

  const existing = (row?.noteRelationships ?? []) as NoteRelationship[]
  const lockedMap = new Map(existing.filter((n) => n.lockedByUser).map((n) => [n.note, n]))

  if (lockedMap.size === 0) return incoming

  // Replace agent entries for locked notes with the locked version.
  const merged = incoming.map((n) => (lockedMap.has(n.note) ? lockedMap.get(n.note)! : n))

  // Append locked notes not present in agent output.
  for (const [key, locked] of lockedMap) {
    if (!merged.some((n) => n.note === key)) merged.push(locked)
  }

  return merged
}

/** Lowercase a string field; passes through null/undefined unchanged. */
function lc(s: string | null | undefined) {
  return s ? s.toLowerCase() : s
}

function opToFlags(op: TableOperation) {
  return {
    isOwned: op.isOwned ?? false,
    isTried: op.isTried ?? false,
    isLiked: op.isLiked ?? false,
    isDisliked: op.isDisliked ?? false,
  }
}

async function updateFragranceFields(executor: DatabaseExecutor, fragranceId: number, op: TableOperation) {
  const updates: Partial<typeof fragrance.$inferInsert> = {}

  if (op.notesSummary !== undefined) updates.notesSummary = lc(op.notesSummary) ?? null

  if (op.pyramidTop != null) updates.pyramidTop = op.pyramidTop.toLowerCase()

  if (op.pyramidMid != null) updates.pyramidMid = op.pyramidMid.toLowerCase()

  if (op.pyramidBase != null) updates.pyramidBase = op.pyramidBase.toLowerCase()

  if (Object.keys(updates).length > 0) {
    await executor.update(fragrance).set(updates).where(eq(fragrance.id, fragranceId))
  }
}

async function applyAddOp(executor: DatabaseExecutor, userId: string, op: TableOperation) {
  let resolvedFragranceId = op.fragranceId

  if (!resolvedFragranceId && op.brandName && op.fragranceName) {
    const brandId = await findOrCreateBrand(executor, op.brandName)
    const pyramid = {
      pyramidTop: lc(op.pyramidTop) ?? null,
      pyramidMid: lc(op.pyramidMid) ?? null,
      pyramidBase: lc(op.pyramidBase) ?? null,
    }

    resolvedFragranceId = await findOrCreateFragrance(executor, brandId, op.fragranceName, lc(op.notesSummary), pyramid)
  } else if (resolvedFragranceId) {
    await updateFragranceFields(executor, resolvedFragranceId, op)
  }

  if (!resolvedFragranceId) return

  const flags = opToFlags(op)

  await executor
    .insert(userFragrance)
    .values({
      userId,
      fragranceId: resolvedFragranceId,
      rating: op.rating ?? 0,
      agentComment: op.agentComment,
      userComment: op.userComment ?? null,
      season: lc(op.season) ?? null,
      timeOfDay: lc(op.timeOfDay) ?? null,
      gender: op.gender ?? null,
      isRecommendation: !flags.isTried && !flags.isOwned,
      ...flags,
    })
    .onConflictDoUpdate({
      target: [userFragrance.userId, userFragrance.fragranceId],
      set: {
        rating: op.rating ?? 0,
        agentComment: op.agentComment ?? null,
        userComment: op.userComment ?? null,
        season: lc(op.season) ?? null,
        timeOfDay: lc(op.timeOfDay) ?? null,
        gender: op.gender ?? null,
        isRecommendation: !flags.isTried && !flags.isOwned,
        ...flags,
      },
    })
}

async function applyPyramidAndNotesUpdate(
  executor: DatabaseExecutor,
  userId: string,
  rowId: number,
  op: TableOperation,
) {
  const [uf] = await executor
    .select({ fragranceId: userFragrance.fragranceId })
    .from(userFragrance)
    .where(and(eq(userFragrance.userId, userId), eq(userFragrance.id, rowId)))
    .limit(1)

  if (!uf) return

  const hasFragranceUpdate =
    op.notesSummary !== undefined ||
    op.pyramidTop !== undefined ||
    op.pyramidMid !== undefined ||
    op.pyramidBase !== undefined

  if (!hasFragranceUpdate) return

  await updateFragranceFields(executor, uf.fragranceId, op)
}

async function applyUpdateOp(executor: DatabaseExecutor, userId: string, op: TableOperation) {
  if (!op.rowId) return

  await applyPyramidAndNotesUpdate(executor, userId, op.rowId, op)

  const updates: Partial<typeof userFragrance.$inferInsert> = {}

  if (typeof op.rating === 'number') updates.rating = op.rating

  if (typeof op.agentComment === 'string') updates.agentComment = op.agentComment

  if (typeof op.userComment === 'string') updates.userComment = op.userComment

  if (typeof op.season === 'string') updates.season = op.season.toLowerCase()

  if (typeof op.timeOfDay === 'string') updates.timeOfDay = op.timeOfDay.toLowerCase()

  if (typeof op.gender === 'string') updates.gender = op.gender

  if (typeof op.isOwned === 'boolean') updates.isOwned = op.isOwned

  if (typeof op.isTried === 'boolean') updates.isTried = op.isTried

  if (op.isLiked !== undefined) updates.isLiked = op.isLiked

  if (op.isDisliked !== undefined) updates.isDisliked = op.isDisliked

  if (Object.keys(updates).length === 0) return

  await executor
    .update(userFragrance)
    .set(updates)
    .where(and(eq(userFragrance.userId, userId), eq(userFragrance.id, op.rowId)))
}

async function applyTableOp(executor: DatabaseExecutor, userId: string, op: TableOperation) {
  if (op.op === 'add') {
    await applyAddOp(executor, userId, op)

    return
  }

  if (!op.rowId) return

  if (op.op === 'remove') {
    await executor.delete(userFragrance).where(and(eq(userFragrance.userId, userId), eq(userFragrance.id, op.rowId)))

    return
  }

  if (op.op === 'rate' && typeof op.rating === 'number') {
    await executor
      .update(userFragrance)
      .set({ rating: op.rating })
      .where(and(eq(userFragrance.userId, userId), eq(userFragrance.id, op.rowId)))

    return
  }

  if (op.op === 'move') {
    const flags = opToFlags(op)

    await executor
      .update(userFragrance)
      .set({ ...flags, isRecommendation: false })
      .where(and(eq(userFragrance.userId, userId), eq(userFragrance.id, op.rowId)))

    return
  }

  await applyUpdateOp(executor, userId, op)
}

export async function applyAgentMemoryOps(
  executor: DatabaseExecutor,
  userId: string,
  ops: AgentMemoryOp[] | undefined | null,
) {
  if (ops == null || ops.length === 0) {
    return
  }

  for (const op of ops) {
    if (op.op === 'add') {
      const [{ n }] = await executor
        .select({ n: count() })
        .from(userAgentMemory)
        .where(eq(userAgentMemory.userId, userId))

      if (n >= AGENT_MEMORY_MAX_ROWS) {
        continue
      }

      await executor.insert(userAgentMemory).values({
        userId,
        content: op.content,
        source: 'agent',
      })
    } else if (op.op === 'update') {
      await executor
        .update(userAgentMemory)
        .set({ content: op.content, updatedAt: new Date() })
        .where(and(eq(userAgentMemory.id, op.id), eq(userAgentMemory.userId, userId)))
    } else {
      await executor
        .delete(userAgentMemory)
        .where(and(eq(userAgentMemory.id, op.id), eq(userAgentMemory.userId, userId)))
    }
  }
}

export async function applyPatchToDatabase(userId: string, patch: StructuredPreferencePatch) {
  await db.transaction(async (tx) => {
    if (patch.profile != null || patch.suggestions != null) {
      const mergedNoteRels =
        patch.profile?.noteRelationships == null
          ? undefined
          : ((await mergeNoteRelationships(userId, patch.profile.noteRelationships)) as never[])

      await tx
        .insert(userProfile)
        .values({
          userId,
          archetype: patch.profile?.archetype,
          favoriteNote: patch.profile?.favoriteNote,
          radar: patch.profile?.radar,
          radarLabels: patch.profile?.radarLabels,
          preferences: patch.profile?.preferences,
          noteRelationships: mergedNoteRels,
          suggestions: patch.suggestions ?? undefined,
        })
        .onConflictDoUpdate({
          target: userProfile.userId,
          set: {
            ...(patch.profile?.archetype != null && { archetype: patch.profile.archetype }),
            ...(patch.profile?.favoriteNote != null && { favoriteNote: patch.profile.favoriteNote }),
            ...(patch.profile?.radar != null && { radar: patch.profile.radar }),
            ...(patch.profile?.radarLabels != null && { radarLabels: patch.profile.radarLabels }),
            ...(patch.profile?.preferences != null && { preferences: patch.profile.preferences }),
            ...(mergedNoteRels != null && { noteRelationships: mergedNoteRels }),
            ...(patch.suggestions != null && { suggestions: patch.suggestions }),
          },
        })
    }

    // Apply tableOps FIRST so that user interactions with recommendations
    // (e.g. op=move marking a rec as disliked) are committed before the
    // recommendations block deletes isRecommendation=true,isTried=false rows.
    for (const op of patch.tableOps) {
      await applyTableOp(tx, userId, op)
    }

    if (patch.recommendations != null) {
      await tx
        .delete(userFragrance)
        .where(
          and(
            eq(userFragrance.userId, userId),
            eq(userFragrance.isRecommendation, true),
            eq(userFragrance.isTried, false),
          ),
        )

      for (const rec of patch.recommendations) {
        const brandId = await findOrCreateBrand(tx, rec.brand)
        const fragranceId = await findOrCreateFragrance(tx, brandId, rec.name, lc(rec.notesSummary), {
          pyramidTop: lc(rec.pyramidTop) ?? null,
          pyramidMid: lc(rec.pyramidMid) ?? null,
          pyramidBase: lc(rec.pyramidBase) ?? null,
        })

        await tx
          .insert(userFragrance)
          .values({
            userId,
            fragranceId,
            rating: 0,
            isOwned: false,
            isTried: false,
            isLiked: false,
            isDisliked: false,
            isRecommendation: true,
            agentComment: rec.tag || null,
            gender: rec.gender ?? null,
            timeOfDay: rec.timeOfDay ?? null,
            season: rec.season ?? null,
          })
          .onConflictDoNothing()
      }
    }

    await applyAgentMemoryOps(tx, userId, patch.agentMemoryOps)
  })
}

/** Apply only the profile/suggestions part of a patch (no transaction needed — simple upsert). */
export async function applyProfileAndSuggestions(userId: string, patch: StructuredPreferencePatch) {
  if (patch.profile == null && patch.suggestions == null) return

  const mergedNoteRels =
    patch.profile?.noteRelationships == null
      ? undefined
      : ((await mergeNoteRelationships(userId, patch.profile.noteRelationships)) as never[])

  await db
    .insert(userProfile)
    .values({
      userId,
      archetype: patch.profile?.archetype,
      favoriteNote: patch.profile?.favoriteNote,
      radar: patch.profile?.radar,
      radarLabels: patch.profile?.radarLabels,
      preferences: patch.profile?.preferences,
      noteRelationships: mergedNoteRels,
      suggestions: patch.suggestions ?? undefined,
    })
    .onConflictDoUpdate({
      target: userProfile.userId,
      set: {
        ...(patch.profile?.archetype != null && { archetype: patch.profile.archetype }),
        ...(patch.profile?.favoriteNote != null && { favoriteNote: patch.profile.favoriteNote }),
        ...(patch.profile?.radar != null && { radar: patch.profile.radar }),
        ...(patch.profile?.radarLabels != null && { radarLabels: patch.profile.radarLabels }),
        ...(patch.profile?.preferences != null && { preferences: patch.profile.preferences }),
        ...(mergedNoteRels != null && { noteRelationships: mergedNoteRels }),
        ...(patch.suggestions != null && { suggestions: patch.suggestions }),
      },
    })
}

/** Apply only the recommendations part of a patch (clears old unreached recs, inserts new). */
export async function applyRecommendations(userId: string, patch: StructuredPreferencePatch) {
  const recommendations = patch.recommendations

  if (recommendations == null) return

  const dismissedRows = await db
    .select({ fragranceId: aiRecommendationDismissed.fragranceId })
    .from(aiRecommendationDismissed)
    .where(eq(aiRecommendationDismissed.userId, userId))
  const dismissed = new Set(dismissedRows.map((row) => row.fragranceId))

  await db.transaction(async (tx) => {
    await tx
      .delete(userFragrance)
      .where(
        and(
          eq(userFragrance.userId, userId),
          eq(userFragrance.isRecommendation, true),
          eq(userFragrance.isTried, false),
        ),
      )

    for (const rec of recommendations) {
      const brandId = await findOrCreateBrand(tx, rec.brand)
      const fragranceId = await findOrCreateFragrance(tx, brandId, rec.name, lc(rec.notesSummary), {
        pyramidTop: lc(rec.pyramidTop) ?? null,
        pyramidMid: lc(rec.pyramidMid) ?? null,
        pyramidBase: lc(rec.pyramidBase) ?? null,
      })

      if (dismissed.has(fragranceId)) continue

      await tx
        .insert(userFragrance)
        .values({
          userId,
          fragranceId,
          rating: 0,
          isOwned: false,
          isTried: false,
          isLiked: false,
          isDisliked: false,
          isRecommendation: true,
          agentComment: rec.tag || null,
          gender: rec.gender ?? null,
          timeOfDay: rec.timeOfDay ?? null,
          season: rec.season ?? null,
        })
        .onConflictDoNothing()
    }
  })
}

/** Apply a single table operation (no wrapping transaction). */
export async function applySingleTableOp(userId: string, op: TableOperation) {
  await applyTableOp(db, userId, op)
}
