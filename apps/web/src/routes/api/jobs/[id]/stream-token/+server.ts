import { error, json } from '@sveltejs/kit'
import { SignJWT } from 'jose'

import { getJob } from '$lib/server/ai/jobs'

import type { RequestHandler } from './$types'

import { env } from '$env/dynamic/private'

export const POST: RequestHandler = async ({ params, locals }) => {
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

  const secret = env.JOB_STREAM_JWT_SECRET?.trim()

  if (!secret) {
    throw error(503, 'JOB_STREAM_NOT_CONFIGURED')
  }

  const key = new TextEncoder().encode(secret)
  const token = await new SignJWT({ jobId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(locals.user.id)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(key)

  return json({ token })
}
