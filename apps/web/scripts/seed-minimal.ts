import { Client } from 'pg'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for seed script')
}

const userId = process.env.SEED_USER_ID ?? 'dev-user'
const client = new Client({ connectionString: databaseUrl })

await client.connect()

const brandInsert = await client.query<{ id: number }>('insert into brand(name) values($1) returning id', [
  `Seed Brand ${Date.now()}`,
])
const brandId = brandInsert.rows[0].id

const fragranceInsert = await client.query<{ id: number }>(
  'insert into fragrance(brand_id, name, notes_summary) values($1,$2,$3) returning id',
  [brandId, `Seed Fragrance ${Date.now()}`, 'iris, cedar, tea'],
)
const fragranceId = fragranceInsert.rows[0].id

await client.query(
  `insert into user_profile(user_id, archetype, favorite_note, radar)
   values($1,$2,$3,$4::jsonb)
   on conflict (user_id) do nothing`,
  [
    userId,
    'Modern classic',
    'iris',
    JSON.stringify({ citrus: 60, green: 50, wood: 80, spice: 35, sweet: 25, metallic: 10 }),
  ],
)

await client.query(
  'insert into user_fragrance(user_id, fragrance_id, list_type, rating, is_owned, status_label) values($1,$2,$3,$4,$5,$6)',
  [userId, fragranceId, 'owned', 4, true, 'Collection'],
)

await client.query(
  'insert into ai_pending_patch(user_id, patch_type, summary, confidence, payload, status) values($1,$2,$3,$4,$5::jsonb,$6)',
  [
    userId,
    'critical',
    'Seed critical profile update',
    84,
    JSON.stringify({
      confidence: 0.84,
      summary: 'Seed patch',
      profile: { archetype: 'Explorer' },
      tableOps: [],
    }),
    'created',
  ],
)

await client.end()

console.log(`Seed completed for user: ${userId}`)
