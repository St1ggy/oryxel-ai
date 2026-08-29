import { type db } from '@oryxel/db'
import { brand, fragrance } from '@oryxel/db'
import { and, eq } from 'drizzle-orm'

// Works for both the top-level db instance and a transaction object
type DatabaseOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function findOrCreateBrand(tx: DatabaseOrTx, name: string, userId: string) {
  const trimmed = name.trim()

  // brand.name has a unique constraint — onConflictDoNothing is safe here
  await tx.insert(brand).values({ name: trimmed, origin: 'user', createdByUserId: userId }).onConflictDoNothing()

  const [row] = await tx.select({ id: brand.id }).from(brand).where(eq(brand.name, trimmed)).for('update').limit(1)

  return row.id
}

export async function findOrCreateFragrance(tx: DatabaseOrTx, brandId: number, name: string, userId: string) {
  const trimmed = name.trim()

  // fragrance table has NO unique constraint on (brandId, name) — select-then-insert
  const [existing] = await tx
    .select({ id: fragrance.id })
    .from(fragrance)
    .where(and(eq(fragrance.brandId, brandId), eq(fragrance.name, trimmed)))
    .for('update')
    .limit(1)

  if (existing) return existing.id

  const [inserted] = await tx
    .insert(fragrance)
    .values({
      brandId,
      name: trimmed,
      origin: 'user',
      createdByUserId: userId,
    })
    .returning({ id: fragrance.id })

  return inserted.id
}
