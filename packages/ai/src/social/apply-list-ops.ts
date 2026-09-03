import { db } from '@oryxel/db'

import { createJob } from '../ai/jobs.js'

import { addListItem, createList, listItemsForList, removeListItem, updateList } from './lists.js'
import { searchFragrancesByQuery } from './search.js'
import { shouldNotifyFollowers } from './visibility.js'

import type { ListOp, Visibility } from './types.js'

type DatabaseExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export type ApplyListOpsResult = {
  createdListIds: number[]
  notifyList: boolean
}

export async function applyListOps(userId: string, ops: ListOp[], executor: DatabaseExecutor = db) {
  const createdListIds: number[] = []
  let isNotifyList = false
  let lastListId: number | undefined

  for (const op of ops) {
    switch (op.op) {
      case 'create': {
        const list = await createList(
          userId,
          {
            title: op.title ?? 'Collection',
            description: op.description,
            kind: op.kind,
            diaryFilter: op.diaryFilter,
            visibility: op.visibility,
          },
          executor,
        )

        createdListIds.push(list.id)
        lastListId = list.id

        if (shouldNotifyFollowers(list.visibility)) isNotifyList = true

        break
      }

      case 'add': {
        const listId = op.listId ?? lastListId

        if (!listId) break

        let fragranceId = op.fragranceId

        if (!fragranceId && op.fragranceQuery) {
          const hits = await searchFragrancesByQuery(op.fragranceQuery, userId, 1, executor)

          fragranceId = hits[0]?.fragranceId
        }

        if (!fragranceId) break

        await addListItem(
          listId,
          userId,
          {
            fragranceId,
            userFragranceId: op.userFragranceId,
          },
          executor,
        )
        lastListId = listId
        break
      }

      case 'remove': {
        if (!op.listId || !op.fragranceId) break

        const items = await listItemsForList(op.listId, executor)
        const item = items.find((index) => index.fragranceId === op.fragranceId)

        if (item) await removeListItem(op.listId, userId, item.id, executor)

        break
      }

      case 'set_visibility': {
        if (!op.listId || !op.visibility) break

        const updated = await updateList(op.listId, userId, { visibility: op.visibility as Visibility }, executor)

        if (updated && shouldNotifyFollowers(updated.visibility)) isNotifyList = true

        break
      }
    }
  }

  return { createdListIds, notifyList: isNotifyList }
}

export async function enqueueListNotifyJob(ownerId: string, listId: number, executor: DatabaseExecutor = db) {
  await createJob(ownerId, 'notify_list', { listId }, executor)
}
