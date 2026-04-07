import { error, json } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '$lib/server/db'
import { userAgentMemory } from '$lib/server/db/schema'

import type { RequestHandler } from './$types'

const patchBodySchema = z.object({
  content: z.string().trim().min(1).max(500),
})

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const id = Number(params.id)

  if (!Number.isFinite(id)) {
    throw error(400, 'BAD_ID')
  }

  const body = patchBodySchema.parse(await request.json())

  const [updated] = await db
    .update(userAgentMemory)
    .set({ content: body.content, updatedAt: new Date() })
    .where(and(eq(userAgentMemory.id, id), eq(userAgentMemory.userId, locals.user.id)))
    .returning({
      id: userAgentMemory.id,
      content: userAgentMemory.content,
      createdAt: userAgentMemory.createdAt,
      updatedAt: userAgentMemory.updatedAt,
    })

  if (!updated) {
    throw error(404, 'NOT_FOUND')
  }

  return json(updated)
}

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const id = Number(params.id)

  if (!Number.isFinite(id)) {
    throw error(400, 'BAD_ID')
  }

  const deleted = await db
    .delete(userAgentMemory)
    .where(and(eq(userAgentMemory.id, id), eq(userAgentMemory.userId, locals.user.id)))
    .returning({ id: userAgentMemory.id })

  if (deleted.length === 0) {
    throw error(404, 'NOT_FOUND')
  }

  return json({ ok: true })
}
