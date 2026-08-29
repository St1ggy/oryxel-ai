import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { applyPendingPatch, rejectPendingPatch } from '$lib/server/ai/storage'
import { withUserDataLock } from '$lib/server/db'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  patchId: z.number().int().positive(),
  decision: z.enum(['confirm', 'reject']),
})

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = bodySchema.parse(await request.json())

  if (body.decision === 'reject') {
    const result = await rejectPendingPatch({ patchId: body.patchId, userId: locals.user.id })

    if (result.status === 'not_found') throw error(404, 'PATCH_NOT_FOUND')

    if (result.status === 'conflict') throw error(409, 'PATCH_ALREADY_RESOLVED')

    return json({ ok: true, status: 'rejected' })
  }

  const result = await withUserDataLock(locals.user.id, async () => {
    try {
      return await applyPendingPatch({
        patchId: body.patchId,
        userId: locals.user!.id,
        expectedStatus: 'created',
        recordConfirmation: true,
      })
    } catch {
      throw error(500, 'PATCH_APPLY_FAILED')
    }
  })

  if (result.status === 'not_found') throw error(404, 'PATCH_NOT_FOUND')

  if (result.status === 'conflict') throw error(409, 'PATCH_ALREADY_RESOLVED')

  return json({
    ok: true,
    status: 'applied',
    appliedPatch: result.payload as unknown as Record<string, unknown>,
  })
}
