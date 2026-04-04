import { and, eq } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { fragrance, userFragrance, userProfile } from '$lib/server/db/schema'
import { findOrCreateBrand, findOrCreateFragrance } from '$lib/server/diary/find-or-create'

import type { StructuredPreferencePatch, TableOperation } from './contracts'

type DatabaseExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Lowercase a string field; passes through null/undefined unchanged. */
function lc(s: string | null | undefined): string | null | undefined {
  return s ? s.toLowerCase() : s
}

function opToFlags(op: TableOperation): { isOwned: boolean; isTried: boolean; isLiked: boolean | null } {
  return {
    isOwned: op.isOwned ?? false,
    isTried: op.isTried ?? false,
    isLiked: op.isLiked ?? null,
  }
}

async function updateFragranceFields(
  executor: DatabaseExecutor,
  fragranceId: number,
  op: TableOperation,
): Promise<void> {
  const updates: Partial<typeof fragrance.$inferInsert> = {}

  if (op.notesSummary !== undefined) updates.notesSummary = lc(op.notesSummary) ?? null

  if (op.pyramidTop != null) updates.pyramidTop = op.pyramidTop.toLowerCase()

  if (op.pyramidMid != null) updates.pyramidMid = op.pyramidMid.toLowerCase()

  if (op.pyramidBase != null) updates.pyramidBase = op.pyramidBase.toLowerCase()

  if (Object.keys(updates).length > 0) {
    await executor.update(fragrance).set(updates).where(eq(fragrance.id, fragranceId))
  }
}

async function applyAddOp(executor: DatabaseExecutor, userId: string, op: TableOperation): Promise<void> {
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
): Promise<void> {
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

async function applyUpdateOp(executor: DatabaseExecutor, userId: string, op: TableOperation): Promise<void> {
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

  if (Object.keys(updates).length === 0) return

  await executor
    .update(userFragrance)
    .set(updates)
    .where(and(eq(userFragrance.userId, userId), eq(userFragrance.id, op.rowId)))
}

async function applyTableOp(executor: DatabaseExecutor, userId: string, op: TableOperation): Promise<void> {
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
      .set(flags)
      .where(and(eq(userFragrance.userId, userId), eq(userFragrance.id, op.rowId)))

    return
  }

  await applyUpdateOp(executor, userId, op)
}

export async function applyPatchToDatabase(userId: string, patch: StructuredPreferencePatch): Promise<void> {
  await db.transaction(async (tx) => {
    if (patch.profile != null || patch.suggestions != null) {
      await tx
        .insert(userProfile)
        .values({
          userId,
          archetype: patch.profile?.archetype,
          favoriteNote: patch.profile?.favoriteNote,
          radar: patch.profile?.radar,
          radarLabels: patch.profile?.radarLabels,
          preferences: patch.profile?.preferences,
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
            ...(patch.suggestions != null && { suggestions: patch.suggestions }),
          },
        })
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
            isLiked: null,
            isRecommendation: true,
            agentComment: rec.tag || null,
          })
          .onConflictDoNothing()
      }
    }

    for (const op of patch.tableOps) {
      await applyTableOp(tx, userId, op)
    }
  })
}

/** Apply only the profile/suggestions part of a patch (no transaction needed — simple upsert). */
export async function applyProfileAndSuggestions(userId: string, patch: StructuredPreferencePatch): Promise<void> {
  if (patch.profile == null && patch.suggestions == null) return

  await db
    .insert(userProfile)
    .values({
      userId,
      archetype: patch.profile?.archetype,
      favoriteNote: patch.profile?.favoriteNote,
      radar: patch.profile?.radar,
      radarLabels: patch.profile?.radarLabels,
      preferences: patch.profile?.preferences,
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
        ...(patch.suggestions != null && { suggestions: patch.suggestions }),
      },
    })
}

/** Apply only the recommendations part of a patch (clears old unreached recs, inserts new). */
export async function applyRecommendations(userId: string, patch: StructuredPreferencePatch): Promise<void> {
  const recommendations = patch.recommendations

  if (recommendations == null) return

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

      await tx
        .insert(userFragrance)
        .values({
          userId,
          fragranceId,
          rating: 0,
          isOwned: false,
          isTried: false,
          isLiked: null,
          isRecommendation: true,
          agentComment: rec.tag || null,
        })
        .onConflictDoNothing()
    }
  })
}

/** Apply a single table operation (no wrapping transaction). */
export async function applySingleTableOp(userId: string, op: TableOperation): Promise<void> {
  await applyTableOp(db, userId, op)
}
