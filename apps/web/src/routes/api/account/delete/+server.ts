import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { deleteUserDataCompletely } from '$lib/server/account/privacy'
import { isSessionFresh } from '$lib/server/auth/fresh-session'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  confirmText: z.literal('DELETE'),
})

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user || !locals.session) {
    throw error(401, 'AUTH_REQUIRED')
  }

  if (!isSessionFresh(locals.session.createdAt)) throw error(403, 'SESSION_NOT_FRESH')

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    throw error(400, 'INVALID_CONFIRMATION')
  }

  const body = bodySchema.safeParse(rawBody)

  if (!body.success) throw error(400, 'INVALID_CONFIRMATION')

  await deleteUserDataCompletely({
    userId: locals.user.id,
    userEmail: locals.user.email,
  })

  return json(
    { ok: true },
    {
      headers: {
        'cache-control': 'private, no-store',
        'clear-site-data': '"cache", "cookies", "storage"',
      },
    },
  )
}
