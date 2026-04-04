import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { createJob } from '$lib/server/ai/jobs'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  locale: z.string().min(2).max(10).optional(),
})

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = bodySchema.parse(await request.json())
  const locale = body.locale ?? 'en'
  const userId = locals.user.id

  const jobId = await createJob(userId, 'profile_sync', { locale })

  return json({ jobId })
}
