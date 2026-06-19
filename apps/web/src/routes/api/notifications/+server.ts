import { countUnreadNotifications, listNotifications } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  if (url.searchParams.get('unread') === '1') {
    const count = await countUnreadNotifications(locals.user.id)

    return json({ count })
  }

  const notifications = await listNotifications(locals.user.id)

  return json({ notifications })
}
