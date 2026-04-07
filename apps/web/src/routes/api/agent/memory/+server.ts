import { AGENT_MEMORY_MAX_ROWS } from '@oryxel/ai'
import { error, json } from '@sveltejs/kit'
import { count, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '$lib/server/db'
import { userAgentMemory } from '$lib/server/db/schema'

import type { RequestHandler } from './$types'

const createBodySchema = z.object({
  content: z.string().trim().min(1).max(500),
})

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const rows = await db
    .select({
      id: userAgentMemory.id,
      content: userAgentMemory.content,
      createdAt: userAgentMemory.createdAt,
      updatedAt: userAgentMemory.updatedAt,
    })
    .from(userAgentMemory)
    .where(eq(userAgentMemory.userId, locals.user.id))
    .orderBy(desc(userAgentMemory.updatedAt))
    .limit(AGENT_MEMORY_MAX_ROWS)

  return json({ items: rows })
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = createBodySchema.parse(await request.json())

  const [{ n }] = await db
    .select({ n: count() })
    .from(userAgentMemory)
    .where(eq(userAgentMemory.userId, locals.user.id))

  if (n >= AGENT_MEMORY_MAX_ROWS) {
    throw error(400, 'MEMORY_LIMIT')
  }

  const [inserted] = await db
    .insert(userAgentMemory)
    .values({ userId: locals.user.id, content: body.content })
    .returning({
      id: userAgentMemory.id,
      content: userAgentMemory.content,
      createdAt: userAgentMemory.createdAt,
      updatedAt: userAgentMemory.updatedAt,
    })

  return json(inserted)
}
