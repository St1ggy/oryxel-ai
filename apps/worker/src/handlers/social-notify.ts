import {
  completeJob,
  createNotification,
  createNotificationsBatch,
  failJob,
  getPostById,
  getListById,
  listFollowerIds,
  visibilityAtLeast,
} from '@oryxel/ai/server'

import type { Visibility } from '@oryxel/ai/server'

export async function handleNotifyPost(jobId: number, params: Record<string, unknown>) {
  try {
    const postId = params['postId'] as number
    const authorId = params['authorId'] as string

    const row = await getPostById(postId)

    if (!row || row.authorId !== authorId) {
      await completeJob(jobId, { skipped: true })

      return
    }

    const followers = await listFollowerIds(authorId)

    await createNotificationsBatch(followers, {
      actorId: authorId,
      type: 'new_post',
      entityType: 'post',
      entityId: postId,
      payload: { visibility: row.visibility },
    })

    await completeJob(jobId, { notified: followers.length })
  } catch (error) {
    await failJob(jobId, error instanceof Error ? error.message : 'notify_post failed')
  }
}

export async function handleNotifyFollow(jobId: number, params: Record<string, unknown>) {
  try {
    const followerId = params['followerId'] as string
    const followingId = params['followingId'] as string

    await createNotification({
      recipientId: followingId,
      actorId: followerId,
      type: 'new_follower',
      entityType: 'user',
      payload: {},
    })

    await completeJob(jobId, { ok: true })
  } catch (error) {
    await failJob(jobId, error instanceof Error ? error.message : 'notify_follow failed')
  }
}

export async function handleNotifyList(jobId: number, userId: string, params: Record<string, unknown>) {
  try {
    const listId = (params['listId'] as number) ?? 0
    const list = await getListById(listId, userId)

    if (!list || !visibilityAtLeast(list.visibility, 'followers')) {
      await completeJob(jobId, { skipped: true })

      return
    }

    const followers = await listFollowerIds(userId)

    await createNotificationsBatch(followers, {
      actorId: userId,
      type: 'new_list',
      entityType: 'list',
      entityId: listId,
      payload: { slug: list.slug, title: list.title, visibility: list.visibility as Visibility },
    })

    await completeJob(jobId, { notified: followers.length })
  } catch (error) {
    await failJob(jobId, error instanceof Error ? error.message : 'notify_list failed')
  }
}
