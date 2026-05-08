export type JobUpdatedHandler = (jobId: number) => void | Promise<void>
export type JobCreatedHandler = (jobId: number) => void | Promise<void>

let updatedHandler: JobUpdatedHandler | undefined
let createdHandler: JobCreatedHandler | undefined

/** Worker (or tests) registers a Redis publish / side effect after job row updates. */
export function setJobUpdatedHandler(next: JobUpdatedHandler | undefined): void {
  updatedHandler = next
}

/** Caller registers a publish hook fired when a new pending job is enqueued (for worker wake-up). */
export function setJobCreatedHandler(next: JobCreatedHandler | undefined): void {
  createdHandler = next
}

export function emitJobUpdated(jobId: number): void {
  void Promise.resolve(updatedHandler?.(jobId)).catch((error) => {
    console.error('[oryxel/ai] job updated handler failed:', error instanceof Error ? error.message : error)
  })
}

export function emitJobCreated(jobId: number): void {
  void Promise.resolve(createdHandler?.(jobId)).catch((error) => {
    console.error('[oryxel/ai] job created handler failed:', error instanceof Error ? error.message : error)
  })
}
