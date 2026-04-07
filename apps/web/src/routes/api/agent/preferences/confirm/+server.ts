import { error, json } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { applyPatchToDatabase } from '$lib/server/ai/apply'
import { updatePatchStatus } from '$lib/server/ai/storage'
import { db } from '$lib/server/db'
import { aiPendingPatch } from '$lib/server/db/schema'

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

  const [patch] = await db
    .select()
    .from(aiPendingPatch)
    .where(and(eq(aiPendingPatch.id, body.patchId), eq(aiPendingPatch.userId, locals.user.id)))
    .limit(1)

  if (!patch) {
    throw error(404, 'PATCH_NOT_FOUND')
  }

  if (body.decision === 'reject') {
    await updatePatchStatus({
      patchId: patch.id,
      userId: locals.user.id,
      action: 'rejected',
    })

    return json({ ok: true, status: 'rejected' })
  }

  await updatePatchStatus({
    patchId: patch.id,
    userId: locals.user.id,
    action: 'confirmed',
  })

  try {
    await applyPatchToDatabase(locals.user.id, patch.payload as never)
    await updatePatchStatus({
      patchId: patch.id,
      userId: locals.user.id,
      action: 'applied',
    })

    return json({
      ok: true,
      status: 'applied',
      appliedPatch: patch.payload as Record<string, unknown>,
    })
  } catch (error_) {
    await updatePatchStatus({
      patchId: patch.id,
      userId: locals.user.id,
      action: 'failed',
      failureReason: error_ instanceof Error ? error_.message : 'Patch apply failed',
    })
    throw error(500, 'PATCH_APPLY_FAILED')
  }
}
