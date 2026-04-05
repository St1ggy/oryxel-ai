import { error, json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '$lib/server/db'
import { userProfile } from '$lib/server/db/schema'

import type { NoteRelationship } from '$lib/types/diary'
import type { RequestHandler } from './$types'

const sentimentValues = ['love', 'like', 'neutral', 'dislike', 'redflag'] as const

const patchBodySchema = z.object({
  note: z.string().min(1).max(80),
  sentiment: z.enum(sentimentValues).optional(),
  label: z.string().max(200).optional(),
})

const deleteBodySchema = z.object({
  note: z.string().min(1).max(80),
})

async function getCurrentRelationships(userId: string): Promise<NoteRelationship[]> {
  const [row] = await db
    .select({ noteRelationships: userProfile.noteRelationships })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1)

  return (row?.noteRelationships ?? []) as NoteRelationship[]
}

async function saveRelationships(userId: string, relationships: NoteRelationship[]): Promise<void> {
  await db
    .insert(userProfile)
    .values({ userId, noteRelationships: relationships as never[] })
    .onConflictDoUpdate({ target: userProfile.userId, set: { noteRelationships: relationships as never[] } })
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = patchBodySchema.parse(await request.json())
  const current = await getCurrentRelationships(locals.user.id)

  const index = current.findIndex((r) => r.note === body.note)

  if (index === -1) {
    current.push({
      note: body.note,
      sentiment: body.sentiment ?? 'neutral',
      label: body.label ?? body.note,
      ...(body.sentiment !== undefined && { lockedByUser: true }),
    })
  } else {
    current[index] = {
      ...current[index],
      ...(body.sentiment !== undefined && { sentiment: body.sentiment, lockedByUser: true }),
      ...(body.label !== undefined && { label: body.label }),
    }
  }

  await saveRelationships(locals.user.id, current)

  return json({ ok: true })
}

export const DELETE: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = deleteBodySchema.parse(await request.json())
  const current = await getCurrentRelationships(locals.user.id)
  const filtered = current.filter((r) => r.note !== body.note)

  await saveRelationships(locals.user.id, filtered)

  return json({ ok: true })
}
