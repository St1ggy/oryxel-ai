import { createJob } from '@oryxel/ai/server'
import { logEvent } from '@oryxel/runtime'

export * from '@oryxel/ai/server'

export async function createObservedJob(requestId: string, ...jobArguments: Parameters<typeof createJob>) {
  const jobId = await createJob(...jobArguments)

  logEvent('web', 'job.enqueued', { requestId, jobId, jobType: jobArguments[1] })

  return jobId
}
