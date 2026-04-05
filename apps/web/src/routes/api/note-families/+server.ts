import { error, json } from '@sveltejs/kit'
import { asc } from 'drizzle-orm'

import { db } from '$lib/server/db'
import { noteFamily } from '$lib/server/db/schema'
import { BUILTIN_FAMILIES } from '$lib/server/note-families/seed'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized')

  let families = await db.select().from(noteFamily).orderBy(asc(noteFamily.sortOrder))

  // Seed on first access if the table is empty
  if (families.length === 0) {
    await db.insert(noteFamily).values(BUILTIN_FAMILIES).onConflictDoNothing()
    families = await db.select().from(noteFamily).orderBy(asc(noteFamily.sortOrder))
  }

  return json(families)
}
