export function startReconciliation(reconcile: () => void, intervalMs: number) {
  const timer = setInterval(reconcile, intervalMs)

  timer.unref()

  return () => clearInterval(timer)
}
