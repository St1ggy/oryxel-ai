import { getProfileByUsername, listFollowProfiles } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'

import '$lib/server/db'

import type { RequestHandler } from './$types'

async function resolveProfile(username: string) {
  const profile = await getProfileByUsername(username)

  if (!profile) throw error(404, 'NOT_FOUND')

  return profile
}

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const username = params.username?.toLowerCase()

  if (!username) throw error(400, 'INVALID_USERNAME')

  const profile = await resolveProfile(username)
  const limit = Number(url.searchParams.get('limit') ?? '30')
  const cursor = Number(url.searchParams.get('cursor') ?? '')
  const cursorValue = Number.isFinite(cursor) && cursor > 0 ? cursor : undefined
  const { profiles, nextCursor } = await listFollowProfiles(
    profile.userId,
    'following',
    locals.user?.id ?? null,
    Number.isFinite(limit) ? limit : 30,
    cursorValue,
  )

  return json({ profiles, nextCursor: nextCursor ?? null })
}
