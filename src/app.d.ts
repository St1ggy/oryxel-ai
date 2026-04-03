import type { Session, User } from 'better-auth/minimal'

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- SvelteKit merges interface Locals
    interface Locals {
      user?: User
      session?: Session
    }

    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
