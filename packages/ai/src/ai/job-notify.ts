export type JobUpdatedHandler = (jobId: number) => void | Promise<void>

let handler: JobUpdatedHandler | undefined

/** Worker (or tests) registers a Redis publish / side effect after job row updates. */
export function setJobUpdatedHandler(next: JobUpdatedHandler | undefined): void {
  handler = next
}

export function emitJobUpdated(jobId: number): void {
  void Promise.resolve(handler?.(jobId)).catch((error) => {
    console.error('[oryxel/ai] job notify handler failed:', error instanceof Error ? error.message : error)
  })
}
