import { error, json } from '@sveltejs/kit'

import { getJob } from '$lib/server/ai/jobs'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const jobId = Number.parseInt(params.id, 10)

  if (Number.isNaN(jobId)) {
    throw error(400, 'INVALID_JOB_ID')
  }

  const job = await getJob(jobId, locals.user.id)

  if (!job) {
    throw error(404, 'JOB_NOT_FOUND')
  }

  return json(job)
}
