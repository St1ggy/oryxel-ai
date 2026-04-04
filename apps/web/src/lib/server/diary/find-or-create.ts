import { and, eq } from 'drizzle-orm'

import { type db } from '$lib/server/db'
import { brand, fragrance } from '$lib/server/db/schema'

// Works for both the top-level db instance and a transaction object
type DatabaseOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function findOrCreateBrand(tx: DatabaseOrTx, name: string): Promise<number> {
  const trimmed = name.trim()

  // brand.name has a unique constraint — onConflictDoNothing is safe here
  await tx.insert(brand).values({ name: trimmed }).onConflictDoNothing()

  const [row] = await tx.select({ id: brand.id }).from(brand).where(eq(brand.name, trimmed)).limit(1)

  return row.id
}

type PyramidFields = {
  pyramidTop?: string | null
  pyramidMid?: string | null
  pyramidBase?: string | null
}

export async function findOrCreateFragrance(
  tx: DatabaseOrTx,
  brandId: number,
  name: string,
  notesSummary?: string | null,
  pyramid?: PyramidFields,
): Promise<number> {
  const trimmed = name.trim()

  // fragrance table has NO unique constraint on (brandId, name) — select-then-insert
  const [existing] = await tx
    .select({ id: fragrance.id })
    .from(fragrance)
    .where(and(eq(fragrance.brandId, brandId), eq(fragrance.name, trimmed)))
    .limit(1)

  if (existing) {
    const updates: Partial<typeof fragrance.$inferInsert> = {}

    // Overwrite with canonical English text (plain string, no locale maps)
    if (notesSummary != null) updates.notesSummary = notesSummary

    if (pyramid?.pyramidTop != null) updates.pyramidTop = pyramid.pyramidTop

    if (pyramid?.pyramidMid != null) updates.pyramidMid = pyramid.pyramidMid

    if (pyramid?.pyramidBase != null) updates.pyramidBase = pyramid.pyramidBase

    if (Object.keys(updates).length > 0) {
      await tx.update(fragrance).set(updates).where(eq(fragrance.id, existing.id))
    }

    return existing.id
  }

  const [inserted] = await tx
    .insert(fragrance)
    .values({
      brandId,
      name: trimmed,
      notesSummary: notesSummary ?? null,
      pyramidTop: pyramid?.pyramidTop ?? null,
      pyramidMid: pyramid?.pyramidMid ?? null,
      pyramidBase: pyramid?.pyramidBase ?? null,
    })
    .returning({ id: fragrance.id })

  return inserted.id
}
