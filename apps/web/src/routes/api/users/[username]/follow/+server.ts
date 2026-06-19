import { createJob, followUser, getProfileByUsername, unfollowUser } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const profile = await getProfileByUsername(params.username)

  if (!profile) throw error(404, 'NOT_FOUND')

  const ok = await followUser(locals.user.id, profile.userId)

  if (ok) {
    await createJob(profile.userId, 'notify_follow', {
      followerId: locals.user.id,
      followingId: profile.userId,
    })
  }

  return json({ following: true })
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const profile = await getProfileByUsername(params.username)

  if (!profile) throw error(404, 'NOT_FOUND')

  await unfollowUser(locals.user.id, profile.userId)

  return json({ following: false })
}
