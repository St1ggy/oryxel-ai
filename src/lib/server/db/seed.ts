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
      archetype: {
        en: 'Modern classic',
        es: 'Clásico moderno',
        fr: 'Classique moderne',
        jp: 'モダンクラシック',
        ru: 'Современная классика',
        zh: '现代经典',
      },
      favoriteNote: { en: 'iris', es: 'iris', fr: 'iris', jp: 'アイリス', ru: 'ирис', zh: '鸢尾花' },
      radar: { woody: 80, citrus: 60, green: 50, spice: 35, sweet: 25, metallic: 10 },
      radarLabels: {
        woody: { en: 'Woody', es: 'Leñoso', fr: 'Boisé', jp: 'ウッディ', ru: 'Древесный', zh: '木质' },
        citrus: { en: 'Citrus', es: 'Cítrico', fr: 'Citrus', jp: 'シトラス', ru: 'Цитрусовый', zh: '柑橘' },
        green: { en: 'Green', es: 'Verde', fr: 'Vert', jp: 'グリーン', ru: 'Зелёный', zh: '绿意' },
        spice: { en: 'Spice', es: 'Especiado', fr: 'Épicé', jp: 'スパイス', ru: 'Пряный', zh: '香料' },
        sweet: { en: 'Sweet', es: 'Dulce', fr: 'Sucré', jp: 'スイート', ru: 'Сладкий', zh: '甜香' },
        metallic: {
          en: 'Metallic',
          es: 'Metálico',
          fr: 'Métallique',
          jp: 'メタリック',
          ru: 'Металлический',
          zh: '金属感',
        },
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
    statusLabel: 'Collection',
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
