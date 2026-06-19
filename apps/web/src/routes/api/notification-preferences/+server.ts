import { getNotificationPreferences, setNotificationPreference } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import type { RequestHandler } from './$types'

const patchSchema = z.object({
  type: z.enum(['new_post', 'new_follower', 'new_list']),
  enabled: z.boolean(),
})

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const preferences = await getNotificationPreferences(locals.user.id)

  return json({ preferences })
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const body = patchSchema.parse(await request.json())

  await setNotificationPreference(locals.user.id, body.type, body.enabled)

  return json({ ok: true })
}
