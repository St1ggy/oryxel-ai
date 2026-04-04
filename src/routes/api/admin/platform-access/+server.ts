import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { grantPlatformAccess, revokePlatformAccess } from '$lib/server/ai/keys/service'

import type { RequestHandler } from './$types'

import { env } from '$env/dynamic/private'

const bodySchema = z.object({
  userId: z.string().min(1),
  grant: z.boolean(),
})

export const POST: RequestHandler = async ({ request }) => {
  const secret = request.headers.get('x-admin-secret')

  if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) {
    throw error(403, 'Forbidden')
  }

  const body = bodySchema.parse(await request.json())

  await (body.grant ? grantPlatformAccess(body.userId) : revokePlatformAccess(body.userId))

  return json({ ok: true, userId: body.userId, platformAccess: body.grant })
}
