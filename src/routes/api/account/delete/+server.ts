import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { deleteUserDataCompletely } from '$lib/server/account/privacy'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  confirmText: z.literal('DELETE'),
})

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = bodySchema.parse(await request.json())

  if (body.confirmText !== 'DELETE') {
    throw error(400, 'INVALID_CONFIRMATION')
  }

  await deleteUserDataCompletely({
    userId: locals.user.id,
    userEmail: locals.user.email,
  })

  return json({ ok: true })
}
