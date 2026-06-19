import { brand, db, fragrance, userList, userListItem } from '@oryxel/db'
import { and, count, desc, eq, sql } from 'drizzle-orm'

import { slugifyTitle } from './visibility.js'

import type { ListKind, UserListItemRow, UserListRow, Visibility } from './types.js'

export async function listListsForUser(userId: string) {
  const rows = await db
    .select({
      id: userList.id,
      userId: userList.userId,
      slug: userList.slug,
      title: userList.title,
      description: userList.description,
      kind: userList.kind,
      diaryFilter: userList.diaryFilter,
      visibility: userList.visibility,
      createdAt: userList.createdAt,
      updatedAt: userList.updatedAt,
      itemCount: count(userListItem.id),
    })
    .from(userList)
    .leftJoin(userListItem, eq(userListItem.listId, userList.id))
    .where(eq(userList.userId, userId))
    .groupBy(userList.id)
    .orderBy(desc(userList.updatedAt))

  return rows.map((row) => ({
    ...row,
    kind: row.kind as ListKind,
    visibility: row.visibility as Visibility,
    diaryFilter: row.diaryFilter as UserListRow['diaryFilter'],
    itemCount: Number(row.itemCount),
  }))
}

export async function getListById(listId: number, userId: string) {
  const [row] = await db
    .select({
      id: userList.id,
      userId: userList.userId,
      slug: userList.slug,
      title: userList.title,
      description: userList.description,
      kind: userList.kind,
      diaryFilter: userList.diaryFilter,
      visibility: userList.visibility,
      createdAt: userList.createdAt,
      updatedAt: userList.updatedAt,
      itemCount: count(userListItem.id),
    })
    .from(userList)
    .leftJoin(userListItem, eq(userListItem.listId, userList.id))
    .where(and(eq(userList.id, listId), eq(userList.userId, userId)))
    .groupBy(userList.id)
    .limit(1)

  if (!row) return null

  return {
    ...row,
    kind: row.kind as ListKind,
    visibility: row.visibility as Visibility,
    diaryFilter: row.diaryFilter as UserListRow['diaryFilter'],
    itemCount: Number(row.itemCount),
  }
}

export async function getListBySlug(ownerUserId: string, slug: string) {
  const [row] = await db
    .select({
      id: userList.id,
      userId: userList.userId,
      slug: userList.slug,
      title: userList.title,
      description: userList.description,
      kind: userList.kind,
      diaryFilter: userList.diaryFilter,
      visibility: userList.visibility,
      createdAt: userList.createdAt,
      updatedAt: userList.updatedAt,
      itemCount: count(userListItem.id),
    })
    .from(userList)
    .leftJoin(userListItem, eq(userListItem.listId, userList.id))
    .where(and(eq(userList.userId, ownerUserId), eq(userList.slug, slug)))
    .groupBy(userList.id)
    .limit(1)

  if (!row) return null

  return {
    ...row,
    kind: row.kind as ListKind,
    visibility: row.visibility as Visibility,
    diaryFilter: row.diaryFilter as UserListRow['diaryFilter'],
    itemCount: Number(row.itemCount),
  }
}

export async function listItemsForList(listId: number) {
  const rows = await db
    .select({
      id: userListItem.id,
      listId: userListItem.listId,
      fragranceId: userListItem.fragranceId,
      userFragranceId: userListItem.userFragranceId,
      sortOrder: userListItem.sortOrder,
      note: userListItem.note,
      brandName: brand.name,
      fragranceName: fragrance.name,
    })
    .from(userListItem)
    .innerJoin(fragrance, eq(userListItem.fragranceId, fragrance.id))
    .innerJoin(brand, eq(fragrance.brandId, brand.id))
    .where(eq(userListItem.listId, listId))
    .orderBy(userListItem.sortOrder, userListItem.id)

  return rows
}

async function uniqueSlug(userId: string, base: string) {
  let slug = base
  let n = 2

  while (true) {
    const [existing] = await db
      .select({ id: userList.id })
      .from(userList)
      .where(and(eq(userList.userId, userId), eq(userList.slug, slug)))
      .limit(1)

    if (!existing) return slug

    slug = `${base}-${n}`
    n += 1
  }
}

export async function createList(
  userId: string,
  input: {
    title: string
    description?: string | null
    kind?: ListKind
    diaryFilter?: UserListRow['diaryFilter']
    visibility?: Visibility
  },
) {
  const slug = await uniqueSlug(userId, slugifyTitle(input.title))
  const now = new Date()

  const [row] = await db
    .insert(userList)
    .values({
      userId,
      slug,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      kind: input.kind ?? 'custom',
      diaryFilter: input.diaryFilter ?? null,
      visibility: input.visibility ?? 'private',
      updatedAt: now,
    })
    .returning()

  return {
    ...row,
    kind: row.kind as ListKind,
    visibility: row.visibility as Visibility,
    diaryFilter: row.diaryFilter as UserListRow['diaryFilter'],
    itemCount: 0,
  }
}

export async function updateList(
  listId: number,
  userId: string,
  input: {
    title?: string
    description?: string | null
    visibility?: Visibility
  },
) {
  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (input.title !== undefined) updates['title'] = input.title.trim()

  if (input.description !== undefined) updates['description'] = input.description?.trim() || null

  if (input.visibility !== undefined) updates['visibility'] = input.visibility

  const [row] = await db
    .update(userList)
    .set(updates)
    .where(and(eq(userList.id, listId), eq(userList.userId, userId)))
    .returning()

  if (!row) return null

  return getListById(listId, userId)
}

export async function deleteList(listId: number, userId: string) {
  const result = await db.delete(userList).where(and(eq(userList.id, listId), eq(userList.userId, userId)))

  return (result.rowCount ?? 0) > 0
}

export async function addListItem(
  listId: number,
  userId: string,
  input: { fragranceId: number; userFragranceId?: number | null; note?: string | null },
) {
  const list = await getListById(listId, userId)

  if (!list || list.kind === 'diary_slice') return null

  const [maxOrder] = await db
    .select({ max: sql<number>`coalesce(max(${userListItem.sortOrder}), -1)` })
    .from(userListItem)
    .where(eq(userListItem.listId, listId))

  const sortOrder = (maxOrder?.max ?? -1) + 1

  const [inserted] = await db
    .insert(userListItem)
    .values({
      listId,
      fragranceId: input.fragranceId,
      userFragranceId: input.userFragranceId ?? null,
      note: input.note?.trim() || null,
      sortOrder,
    })
    .onConflictDoNothing()
    .returning()

  if (!inserted) {
    const [existing] = await db
      .select({ id: userListItem.id })
      .from(userListItem)
      .where(and(eq(userListItem.listId, listId), eq(userListItem.fragranceId, input.fragranceId)))
      .limit(1)

    if (!existing) return null
  }

  await db.update(userList).set({ updatedAt: new Date() }).where(eq(userList.id, listId))

  const items = await listItemsForList(listId)

  return items.find((item) => item.fragranceId === input.fragranceId) ?? null
}

export async function removeListItem(listId: number, userId: string, itemId: number) {
  const list = await getListById(listId, userId)

  if (!list || list.kind === 'diary_slice') return false

  const result = await db.delete(userListItem).where(and(eq(userListItem.id, itemId), eq(userListItem.listId, listId)))

  if ((result.rowCount ?? 0) > 0) {
    await db.update(userList).set({ updatedAt: new Date() }).where(eq(userList.id, listId))

    return true
  }

  return false
}

export async function listPublicListsForUser(ownerUserId: string) {
  const rows = await listListsForUser(ownerUserId)

  return rows.filter((row) => row.visibility !== 'private')
}
