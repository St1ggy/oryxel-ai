import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { collectUserExportData, toMarkdownExport } from '$lib/server/account/privacy'
import { isSessionFresh } from '$lib/server/auth/fresh-session'

import type { RequestHandler } from './$types'

const formatSchema = z.enum(['json', 'md'])

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user || !locals.session) {
    throw error(401, 'AUTH_REQUIRED')
  }

  if (!isSessionFresh(locals.session.createdAt)) throw error(403, 'SESSION_NOT_FRESH')

  const format = formatSchema.parse(url.searchParams.get('format') ?? 'json')
  const payload = await collectUserExportData(locals.user.id)

  if (format === 'md') {
    return new Response(toMarkdownExport(payload), {
      status: 200,
      headers: {
        'cache-control': 'private, no-store',
        'content-type': 'text/markdown; charset=utf-8',
        'content-disposition': `attachment; filename="oryxel-export-${locals.user.id}.md"`,
      },
    })
  }

  return json(payload, {
    headers: {
      'cache-control': 'private, no-store',
      'content-disposition': `attachment; filename="oryxel-export-${locals.user.id}.json"`,
    },
  })
}
