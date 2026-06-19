import { db, post, postAttachment, userProfile } from '@oryxel/db'
import { and, desc, eq, inArray } from 'drizzle-orm'

import { listFollowingIds } from './follow.js'
import { canView } from './visibility.js'

import type { FeedPost, Visibility } from './types.js'

export async function createPost(
  authorId: string,
  input: {
    body: string
    visibility?: Visibility
    attachments?: { kind: string; entityId?: number; url?: string }[]
  },
) {
  const now = new Date()

  const [row] = await db
    .insert(post)
    .values({
      authorId,
      body: input.body.trim(),
      visibility: input.visibility ?? 'followers',
      updatedAt: now,
    })
    .returning()

  if (input.attachments?.length) {
    await db.insert(postAttachment).values(
      input.attachments.map((attachment) => ({
        postId: row.id,
        kind: attachment.kind,
        entityId: attachment.entityId ?? null,
        url: attachment.url ?? null,
      })),
    )
  }

  const [author] = await db
    .select({ username: userProfile.username, displayName: userProfile.displayName })
    .from(userProfile)
    .where(eq(userProfile.userId, authorId))
    .limit(1)

  return {
    id: row.id,
    authorId: row.authorId,
    authorUsername: author?.username ?? null,
    authorDisplayName: author?.displayName ?? null,
    body: row.body,
    visibility: row.visibility as Visibility,
    createdAt: row.createdAt,
    attachments: (input.attachments ?? []).map((a) => ({
      kind: a.kind,
      entityId: a.entityId ?? null,
      url: a.url ?? null,
    })),
  }
}

export async function getPostById(postId: number) {
  const [row] = await db.select().from(post).where(eq(post.id, postId)).limit(1)

  return row ?? null
}

export async function deletePost(postId: number, authorId: string) {
  const result = await db.delete(post).where(and(eq(post.id, postId), eq(post.authorId, authorId)))

  return (result.rowCount ?? 0) > 0
}

export async function listPostsForAuthor(authorId: string, viewerId: string | null, limit = 30) {
  const rows = await db
    .select()
    .from(post)
    .where(and(eq(post.authorId, authorId), eq(post.status, 'published')))
    .orderBy(desc(post.createdAt))
    .limit(limit)

  const visible: FeedPost[] = []

  const [author] = await db
    .select({ username: userProfile.username, displayName: userProfile.displayName })
    .from(userProfile)
    .where(eq(userProfile.userId, authorId))
    .limit(1)

  for (const row of rows) {
    if (await canView(viewerId, authorId, row.visibility as Visibility)) {
      const attachments = await db
        .select({
          kind: postAttachment.kind,
          entityId: postAttachment.entityId,
          url: postAttachment.url,
        })
        .from(postAttachment)
        .where(eq(postAttachment.postId, row.id))

      visible.push({
        id: row.id,
        authorId: row.authorId,
        authorUsername: author?.username ?? null,
        authorDisplayName: author?.displayName ?? null,
        body: row.body,
        visibility: row.visibility as Visibility,
        createdAt: row.createdAt,
        attachments,
      })
    }
  }

  return visible
}

export async function loadFeedForUser(viewerId: string, limit = 30) {
  const authorIds = [...(await listFollowingIds(viewerId)), viewerId]

  if (authorIds.length === 0) return []

  const rows = await db
    .select()
    .from(post)
    .where(and(inArray(post.authorId, authorIds), eq(post.status, 'published')))
    .orderBy(desc(post.createdAt))
    .limit(limit * 2)

  const profiles = await db
    .select({
      userId: userProfile.userId,
      username: userProfile.username,
      displayName: userProfile.displayName,
    })
    .from(userProfile)
    .where(inArray(userProfile.userId, authorIds))

  const profileByUser = new Map(profiles.map((p) => [p.userId, p]))

  const feed: FeedPost[] = []

  for (const row of rows) {
    if (!(await canView(viewerId, row.authorId, row.visibility as Visibility))) continue

    const attachments = await db
      .select({
        kind: postAttachment.kind,
        entityId: postAttachment.entityId,
        url: postAttachment.url,
      })
      .from(postAttachment)
      .where(eq(postAttachment.postId, row.id))

    const author = profileByUser.get(row.authorId)

    feed.push({
      id: row.id,
      authorId: row.authorId,
      authorUsername: author?.username ?? null,
      authorDisplayName: author?.displayName ?? null,
      body: row.body,
      visibility: row.visibility as Visibility,
      createdAt: row.createdAt,
      attachments,
    })

    if (feed.length >= limit) break
  }

  return feed
}
