export class StreamLimiter {
  readonly #activeByUser = new Map<string, number>()
  #activeTotal = 0

  constructor(
    readonly maxTotal: number,
    readonly maxPerUser: number,
  ) {}

  tryAcquire(userId: string) {
    const userCount = this.#activeByUser.get(userId) ?? 0

    if (this.#activeTotal >= this.maxTotal || userCount >= this.maxPerUser) return null

    this.#activeTotal++
    this.#activeByUser.set(userId, userCount + 1)

    let released = false

    return () => {
      if (released) return

      released = true
      this.#activeTotal--

      const remaining = (this.#activeByUser.get(userId) ?? 1) - 1

      if (remaining === 0) this.#activeByUser.delete(userId)
      else this.#activeByUser.set(userId, remaining)
    }
  }

  get activeTotal() {
    return this.#activeTotal
  }
}
