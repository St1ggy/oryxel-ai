import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { importLegacyProviderKeys } from '$lib/server/ai/keys/service'

import type { RequestHandler } from './$types'

const importBodySchema = z.object({
  providers: z.array(
    z.object({
      provider: z.string().min(1),
      label: z.string().max(120).optional(),
      key: z.string().min(1).optional(),
      active: z.boolean().optional(),
    }),
  ),
})

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = importBodySchema.parse(await request.json())
  const importedCount = await importLegacyProviderKeys(locals.user.id, body.providers)

  return json({ ok: true, importedCount })
}
