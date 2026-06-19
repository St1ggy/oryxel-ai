import { db, userFragrance, userList, userListItem } from '@oryxel/db'
import { and, eq } from 'drizzle-orm'

import { loadDiaryForUser } from '../diary/load.js'

import type { DiaryListType } from './types.js'

function matchesDiaryList(
  row: {
    isOwned: boolean
    isTried: boolean
    isLiked: boolean
    isDisliked: boolean
    isRecommendation: boolean
  },
  listType: DiaryListType,
) {
  switch (listType) {
    case 'owned':
      return row.isOwned
    case 'liked':
      return row.isTried && row.isLiked
    case 'disliked':
      return row.isTried && row.isDisliked
    case 'neutral':
      return row.isTried && !row.isLiked && !row.isDisliked
    case 'to_try':
      return !row.isTried && !row.isOwned
  }
}

export async function syncDiarySliceList(listId: number, userId: string) {
  const [list] = await db
    .select()
    .from(userList)
    .where(and(eq(userList.id, listId), eq(userList.userId, userId)))
    .limit(1)

  if (!list || list.kind !== 'diary_slice' || !list.diaryFilter?.listType) return 0

  const listType = list.diaryFilter.listType as DiaryListType
  const diary = await loadDiaryForUser(userId)
  const bucket = diary[listType] ?? []

  const matchingIds = new Set(
    bucket
      .filter((row) =>
        matchesDiaryList(
          {
            isOwned: row.isOwned,
            isTried: row.isTried,
            isLiked: row.isLiked,
            isDisliked: row.isDisliked,
            isRecommendation: row.isRecommendation,
          },
          listType,
        ),
      )
      .map((row) => row.id),
  )

  const existing = await db
    .select({
      id: userListItem.id,
      fragranceId: userListItem.fragranceId,
      userFragranceId: userListItem.userFragranceId,
    })
    .from(userListItem)
    .where(eq(userListItem.listId, listId))

  const existingByFragrance = new Map(existing.map((item) => [item.fragranceId, item]))

  let order = 0
  let upserted = 0

  for (const row of bucket) {
    if (!matchingIds.has(row.id)) continue

    const fragranceId = row.fragranceId

    if (existingByFragrance.has(fragranceId)) {
      await db
        .update(userListItem)
        .set({ sortOrder: order, userFragranceId: row.id })
        .where(eq(userListItem.id, existingByFragrance.get(fragranceId)!.id))
    } else {
      await db.insert(userListItem).values({
        listId,
        fragranceId,
        userFragranceId: row.id,
        sortOrder: order,
      })
    }

    order += 1
    upserted += 1
  }

  const keepFragranceIds = new Set(bucket.filter((r) => matchingIds.has(r.id)).map((r) => r.fragranceId))

  for (const item of existing) {
    if (!keepFragranceIds.has(item.fragranceId)) {
      await db.delete(userListItem).where(eq(userListItem.id, item.id))
    }
  }

  await db.update(userList).set({ updatedAt: new Date() }).where(eq(userList.id, listId))

  return upserted
}

export async function syncAllDiarySliceListsForUser(userId: string) {
  const lists = await db
    .select()
    .from(userList)
    .where(and(eq(userList.userId, userId), eq(userList.kind, 'diary_slice')))

  for (const list of lists) {
    await syncDiarySliceList(list.id, userId)
  }
}
