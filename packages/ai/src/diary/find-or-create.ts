import { type db } from '@oryxel/db'
import { brand, fragrance } from '@oryxel/db'
import { and, eq, ne, or, sql } from 'drizzle-orm'

// Works for both the top-level db instance and a transaction object
type DatabaseOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function findOrCreateBrand(tx: DatabaseOrTx, name: string, userId: string) {
  const trimmed = name.trim()

  const scope = or(ne(brand.origin, 'user'), eq(brand.createdByUserId, userId))
  const [existing] = await tx
    .select({ id: brand.id })
    .from(brand)
    .where(and(eq(brand.name, trimmed), scope))
    .orderBy(sql`CASE WHEN ${brand.origin} = 'user' THEN 1 ELSE 0 END`)
    .for('update')
    .limit(1)

  if (existing) return existing.id

  await tx.insert(brand).values({ name: trimmed, origin: 'user', createdByUserId: userId }).onConflictDoNothing()

  const [row] = await tx
    .select({ id: brand.id })
    .from(brand)
    .where(and(eq(brand.name, trimmed), scope))
    .orderBy(sql`CASE WHEN ${brand.origin} = 'user' THEN 1 ELSE 0 END`)
    .for('update')
    .limit(1)

  if (!row) throw new Error('Brand identity could not be created')

  return row.id
}

export async function findOrCreateFragrance(tx: DatabaseOrTx, brandId: number, name: string, userId: string) {
  const trimmed = name.trim()

  const scope = or(ne(fragrance.origin, 'user'), eq(fragrance.createdByUserId, userId))
  const [existing] = await tx
    .select({ id: fragrance.id })
    .from(fragrance)
    .where(and(eq(fragrance.brandId, brandId), eq(fragrance.name, trimmed), scope))
    .orderBy(sql`CASE WHEN ${fragrance.origin} = 'user' THEN 1 ELSE 0 END`)
    .for('update')
    .limit(1)

  if (existing) return existing.id

  await tx
    .insert(fragrance)
    .values({
      brandId,
      name: trimmed,
      origin: 'user',
      createdByUserId: userId,
    })
    .onConflictDoNothing()

  const [inserted] = await tx
    .select({ id: fragrance.id })
    .from(fragrance)
    .where(and(eq(fragrance.brandId, brandId), eq(fragrance.name, trimmed), scope))
    .orderBy(sql`CASE WHEN ${fragrance.origin} = 'user' THEN 1 ELSE 0 END`)
    .for('update')
    .limit(1)

  if (!inserted) throw new Error('Fragrance identity could not be created')

  return inserted.id
}
