import {
  aiRecommendationDismissed,
  brand,
  type db,
  fragrance,
  postAttachment,
  userFragrance,
  userListItem,
} from '@oryxel/db'
import { and, eq, notExists } from 'drizzle-orm'

type DatabaseOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function deleteOrphanedUserCatalogEntities(executor: DatabaseOrTx) {
  await executor.delete(fragrance).where(
    and(
      eq(fragrance.origin, 'user'),
      notExists(
        executor
          .select({ id: userFragrance.id })
          .from(userFragrance)
          .where(eq(userFragrance.fragranceId, fragrance.id)),
      ),
      notExists(
        executor
          .select({ id: aiRecommendationDismissed.id })
          .from(aiRecommendationDismissed)
          .where(eq(aiRecommendationDismissed.fragranceId, fragrance.id)),
      ),
      notExists(
        executor.select({ id: userListItem.id }).from(userListItem).where(eq(userListItem.fragranceId, fragrance.id)),
      ),
      notExists(
        executor
          .select({ id: postAttachment.id })
          .from(postAttachment)
          .where(and(eq(postAttachment.kind, 'fragrance'), eq(postAttachment.entityId, fragrance.id))),
      ),
    ),
  )

  await executor.delete(brand).where(
    and(
      eq(brand.origin, 'user'),
      notExists(executor.select({ id: fragrance.id }).from(fragrance).where(eq(fragrance.brandId, brand.id))),
      notExists(
        executor
          .select({ id: postAttachment.id })
          .from(postAttachment)
          .where(and(eq(postAttachment.kind, 'brand'), eq(postAttachment.entityId, brand.id))),
      ),
    ),
  )
}

export async function prepareUserCatalogForAccountDeletion(executor: DatabaseOrTx, userId: string) {
  await deleteOrphanedUserCatalogEntities(executor)

  await executor
    .update(fragrance)
    .set({ createdByUserId: null })
    .where(and(eq(fragrance.origin, 'user'), eq(fragrance.createdByUserId, userId)))
  await executor
    .update(brand)
    .set({ createdByUserId: null })
    .where(and(eq(brand.origin, 'user'), eq(brand.createdByUserId, userId)))
}
