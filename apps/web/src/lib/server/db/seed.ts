import { db } from '$lib/server/db'
import { aiPendingPatch, brand, fragrance, userFragrance, userProfile } from '$lib/server/db/schema'

export async function seedMinimalAgentScenario(userId: string) {
  const [createdBrand] = await db.insert(brand).values({ name: 'Seed Brand' }).onConflictDoNothing().returning()

  const brandId = createdBrand?.id

  if (!brandId) return

  const [createdFragrance] = await db
    .insert(fragrance)
    .values({
      brandId,
      name: 'Seed Fragrance',
      notesSummary: 'iris, cedar, tea',
    })
    .returning()

  if (!createdFragrance) return

  await db
    .insert(userProfile)
    .values({
      userId,
      archetype: 'Modern classic',
      favoriteNote: 'iris',
      radar: { woody: 80, citrus: 60, green: 50, spice: 35, sweet: 25, metallic: 10 },
      radarLabels: {
        woody: 'Woody',
        citrus: 'Citrus',
        green: 'Green',
        spice: 'Spice',
        sweet: 'Sweet',
        metallic: 'Metallic',
      },
    })
    .onConflictDoNothing()

  await db.insert(userFragrance).values({
    userId,
    fragranceId: createdFragrance.id,
    rating: 4,
    isOwned: true,
    isTried: true,
    isLiked: true,
    isDisliked: false,
    userComment: 'Collection',
  })

  await db.insert(aiPendingPatch).values({
    userId,
    patchType: 'critical',
    summary: 'Seed critical profile update',
    confidence: 84,
    payload: {
      confidence: 0.84,
      summary: 'Seed patch',
      profile: { archetype: 'Explorer' },
      tableOps: [],
    },
    status: 'created',
  })
}
