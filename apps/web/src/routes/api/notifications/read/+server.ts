import { markNotificationsRead } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  ids: z.array(z.number().int().positive()).optional(),
})

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const body = bodySchema.parse(await request.json())

  await markNotificationsRead(locals.user.id, body.ids)

  return json({ ok: true })
}
