import { logError } from '@oryxel/runtime'

export type JobUpdatedHandler = (jobId: number) => void | Promise<void>
export type JobCreatedHandler = (jobId: number) => void | Promise<void>

let updatedHandler: JobUpdatedHandler | undefined
let createdHandler: JobCreatedHandler | undefined

//
// Worker (or tests) registers a Redis publish / side effect after job row updates.
//
export function setJobUpdatedHandler(next: JobUpdatedHandler | undefined) {
  updatedHandler = next
}

//
// Caller registers a publish hook fired when a new pending job is enqueued (for worker wake-up).
//
export function setJobCreatedHandler(next: JobCreatedHandler | undefined) {
  createdHandler = next
}

export function emitJobUpdated(jobId: number) {
  void Promise.resolve(updatedHandler?.(jobId)).catch((error) => {
    logError('ai', 'job.updated_handler_failed', error, { component: 'job-notify', jobId })
  })
}

export function emitJobCreated(jobId: number) {
  void Promise.resolve(createdHandler?.(jobId)).catch((error) => {
    logError('ai', 'job.created_handler_failed', error, { component: 'job-notify', jobId })
  })
}
