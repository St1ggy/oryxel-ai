import {
  assertJobLease,
  completeJob,
  failJob,
  syncAllDiarySliceListsForUser,
  syncDiarySliceList,
} from '@oryxel/ai/server'

import type { JobLease } from '@oryxel/ai/server'

export async function handleListSliceSync(job: JobLease, userId: string, params: Record<string, unknown>) {
  try {
    await assertJobLease(job)
    const listId = params['listId'] as number | undefined

    if (listId) {
      const count = await syncDiarySliceList(listId, userId)

      await completeJob(job, { synced: count })
    } else {
      await syncAllDiarySliceListsForUser(userId)
      await completeJob(job, { ok: true })
    }
  } catch (error) {
    await failJob(job, 'LIST_SLICE_SYNC_FAILED', error)
  }
}
