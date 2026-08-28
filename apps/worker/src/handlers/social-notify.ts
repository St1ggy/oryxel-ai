import {
  assertJobLease,
  completeJob,
  createNotification,
  createNotificationsBatch,
  failJob,
  getListById,
  getPostById,
  listFollowerIds,
  visibilityAtLeast,
} from '@oryxel/ai/server'

import type { JobLease, Visibility } from '@oryxel/ai/server'

export async function handleNotifyPost(job: JobLease, params: Record<string, unknown>) {
  try {
    const postId = params['postId'] as number
    const authorId = params['authorId'] as string

    const row = await getPostById(postId)

    if (!row || row.authorId !== authorId) {
      await completeJob(job, { skipped: true })

      return
    }

    const followers = await listFollowerIds(authorId)

    await assertJobLease(job)
    await createNotificationsBatch(followers, {
      actorId: authorId,
      type: 'new_post',
      entityType: 'post',
      entityId: postId,
      payload: { visibility: row.visibility },
    })

    await completeJob(job, { notified: followers.length })
  } catch (error) {
    await failJob(job, error instanceof Error ? error.message : 'notify_post failed')
  }
}

export async function handleNotifyFollow(job: JobLease, params: Record<string, unknown>) {
  try {
    const followerId = params['followerId'] as string
    const followingId = params['followingId'] as string

    await assertJobLease(job)
    await createNotification({
      recipientId: followingId,
      actorId: followerId,
      type: 'new_follower',
      entityType: 'user',
      payload: {},
    })

    await completeJob(job, { ok: true })
  } catch (error) {
    await failJob(job, error instanceof Error ? error.message : 'notify_follow failed')
  }
}

export async function handleNotifyList(job: JobLease, userId: string, params: Record<string, unknown>) {
  try {
    const listId = (params['listId'] as number) ?? 0
    const list = await getListById(listId, userId)

    if (!list || !visibilityAtLeast(list.visibility, 'followers')) {
      await completeJob(job, { skipped: true })

      return
    }

    const followers = await listFollowerIds(userId)

    await assertJobLease(job)
    await createNotificationsBatch(followers, {
      actorId: userId,
      type: 'new_list',
      entityType: 'list',
      entityId: listId,
      payload: { slug: list.slug, title: list.title, visibility: list.visibility as Visibility },
    })

    await completeJob(job, { notified: followers.length })
  } catch (error) {
    await failJob(job, error instanceof Error ? error.message : 'notify_list failed')
  }
}
