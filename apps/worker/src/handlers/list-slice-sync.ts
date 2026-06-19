import { completeJob, failJob, syncAllDiarySliceListsForUser, syncDiarySliceList } from '@oryxel/ai/server'

export async function handleListSliceSync(jobId: number, userId: string, params: Record<string, unknown>) {
  try {
    const listId = params['listId'] as number | undefined

    if (listId) {
      const count = await syncDiarySliceList(listId, userId)
      await completeJob(jobId, { synced: count })
    } else {
      await syncAllDiarySliceListsForUser(userId)
      await completeJob(jobId, { ok: true })
    }
  } catch (error) {
    await failJob(jobId, error instanceof Error ? error.message : 'list_slice_sync failed')
  }
}
