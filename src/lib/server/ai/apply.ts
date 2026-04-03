import { and, eq } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { fragrance, userFragrance, userProfile } from '$lib/server/db/schema'
import { findOrCreateBrand, findOrCreateFragrance } from '$lib/server/diary/find-or-create'
import { listTypeToFlags } from '$lib/server/diary/flags'

import type { StructuredPreferencePatch, TableOperation } from './contracts'

type DatabaseExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

async function applyAddOp(executor: DatabaseExecutor, userId: string, op: TableOperation): Promise<void> {
  let resolvedFragranceId = op.fragranceId

  if (!resolvedFragranceId && op.brandName && op.fragranceName) {
    const brandId = await findOrCreateBrand(executor, op.brandName)
    const pyramid = {
      pyramidTop: op.pyramidTop,
      pyramidMid: op.pyramidMid,
      pyramidBase: op.pyramidBase,
    }

    resolvedFragranceId = await findOrCreateFragrance(executor, brandId, op.fragranceName, op.notesSummary, pyramid)
  } else if (
    resolvedFragranceId &&
    (op.pyramidTop !== undefined || op.pyramidMid !== undefined || op.pyramidBase !== undefined)
  ) {
    const pyramidUpdates: Partial<typeof fragrance.$inferInsert> = {}

    if (op.pyramidTop !== undefined) pyramidUpdates.pyramidTop = op.pyramidTop

    if (op.pyramidMid !== undefined) pyramidUpdates.pyramidMid = op.pyramidMid

    if (op.pyramidBase !== undefined) pyramidUpdates.pyramidBase = op.pyramidBase

    await executor.update(fragrance).set(pyramidUpdates).where(eq(fragrance.id, resolvedFragranceId))
  }

  if (!resolvedFragranceId || !op.listType) return

  const flags = listTypeToFlags(op.listType)

  await executor
    .insert(userFragrance)
    .values({
      userId,
      fragranceId: resolvedFragranceId,
      rating: op.rating ?? 0,
      statusLabel: op.statusLabel,
      isRecommendation: false,
      ...flags,
    })
    .onConflictDoUpdate({
      target: [userFragrance.userId, userFragrance.fragranceId],
      set: {
        rating: op.rating ?? 0,
        statusLabel: op.statusLabel ?? null,
        isRecommendation: false,
        ...flags,
      },
    })
}

function buildPyramidUpdates(op: TableOperation): Partial<typeof fragrance.$inferInsert> | null {
  const updates: Partial<typeof fragrance.$inferInsert> = {}

  if (op.pyramidTop !== undefined) updates.pyramidTop = op.pyramidTop

  if (op.pyramidMid !== undefined) updates.pyramidMid = op.pyramidMid

  if (op.pyramidBase !== undefined) updates.pyramidBase = op.pyramidBase

  return Object.keys(updates).length > 0 ? updates : null
}

async function applyPyramidUpdate(
  executor: DatabaseExecutor,
  userId: string,
  rowId: number,
  op: TableOperation,
): Promise<void> {
  const pyramidUpdates = buildPyramidUpdates(op)

  if (!pyramidUpdates) return

  const [uf] = await executor
    .select({ fragranceId: userFragrance.fragranceId })
    .from(userFragrance)
    .where(and(eq(userFragrance.userId, userId), eq(userFragrance.id, rowId)))
    .limit(1)

  if (uf) {
    await executor.update(fragrance).set(pyramidUpdates).where(eq(fragrance.id, uf.fragranceId))
  }
}

async function applyUpdateOp(executor: DatabaseExecutor, userId: string, op: TableOperation): Promise<void> {
  if (!op.rowId) return

  await applyPyramidUpdate(executor, userId, op.rowId, op)

  const updates: Partial<typeof userFragrance.$inferInsert> = {}

  if (typeof op.rating === 'number') updates.rating = op.rating

  if (typeof op.statusLabel === 'string') updates.statusLabel = op.statusLabel

  if (typeof op.isOwned === 'boolean') updates.isOwned = op.isOwned

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

  if (op.op === 'move' && op.listType) {
    await executor
      .update(userFragrance)
      .set(listTypeToFlags(op.listType))
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
          suggestions: patch.suggestions,
        })
        .onConflictDoUpdate({
          target: userProfile.userId,
          set: {
            ...(patch.profile?.archetype != null && { archetype: patch.profile.archetype }),
            ...(patch.profile?.favoriteNote != null && { favoriteNote: patch.profile.favoriteNote }),
            ...(patch.profile?.radar != null && { radar: patch.profile.radar }),
            ...(patch.profile?.radarLabels != null && { radarLabels: patch.profile.radarLabels }),
            ...(patch.suggestions != null && { suggestions: patch.suggestions }),
          },
        })
    }

    if (patch.recommendations != null) {
      // Replace AI recommendations (isTried=false, isRecommendation=true) with freshly generated ones
      await tx
        .delete(userFragrance)
        .where(
          and(
            eq(userFragrance.userId, userId),
            eq(userFragrance.isTried, false),
            eq(userFragrance.isRecommendation, true),
          ),
        )

      for (const rec of patch.recommendations) {
        const brandId = await findOrCreateBrand(tx, rec.brand)
        const fragranceId = await findOrCreateFragrance(tx, brandId, rec.name)

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
            statusLabel: typeof rec.tag === 'string' ? rec.tag || null : JSON.stringify(rec.tag),
          })
          .onConflictDoNothing()
      }
    }

    for (const op of patch.tableOps) {
      await applyTableOp(tx, userId, op)
    }
  })
}
