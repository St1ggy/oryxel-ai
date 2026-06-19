import { addListItem, createList, listItemsForList, removeListItem, updateList } from './lists.js'
import { searchFragrancesByQuery } from './search.js'
import { createJob } from '../ai/jobs.js'

import type { ListOp } from './types.js'
import type { Visibility } from './types.js'

export type ApplyListOpsResult = {
  createdListIds: number[]
  notifyList: boolean
}

export async function applyListOps(userId: string, ops: ListOp[]) {
  const createdListIds: number[] = []
  let notifyList = false
  let lastListId: number | undefined

  for (const op of ops) {
    switch (op.op) {
      case 'create': {
        const list = await createList(userId, {
          title: op.title ?? 'Collection',
          description: op.description,
          kind: op.kind,
          diaryFilter: op.diaryFilter,
          visibility: op.visibility,
        })

        createdListIds.push(list.id)
        lastListId = list.id

        if (op.visibility && op.visibility !== 'private') notifyList = true
        break
      }

      case 'add': {
        const listId = op.listId ?? lastListId

        if (!listId) break

        let fragranceId = op.fragranceId

        if (!fragranceId && op.fragranceQuery) {
          const hits = await searchFragrancesByQuery(op.fragranceQuery, 1)

          fragranceId = hits[0]?.fragranceId
        }

        if (!fragranceId) break

        await addListItem(listId, userId, {
          fragranceId,
          userFragranceId: op.userFragranceId,
        })
        lastListId = listId
        break
      }

      case 'remove': {
        if (!op.listId || !op.fragranceId) break

        const items = await listItemsForList(op.listId)
        const item = items.find((i) => i.fragranceId === op.fragranceId)

        if (item) await removeListItem(op.listId, userId, item.id)
        break
      }

      case 'set_visibility': {
        if (!op.listId || !op.visibility) break

        const updated = await updateList(op.listId, userId, { visibility: op.visibility as Visibility })

        if (updated && op.visibility !== 'private') notifyList = true
        break
      }
    }
  }

  return { createdListIds, notifyList }
}

export async function enqueueListNotifyJob(ownerId: string, listId: number) {
  await createJob(ownerId, 'notify_list', { listId })
}
