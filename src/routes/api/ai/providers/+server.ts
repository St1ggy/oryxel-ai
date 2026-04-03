import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { getUserDefaultProvider, listUserProviderKeys, upsertUserProviderKey } from '$lib/server/ai/keys/service'

import type { RequestHandler } from './$types'

const createProviderBodySchema = z.object({
  provider: z.string().min(1),
  label: z.string().max(120).optional(),
  key: z.string().min(1),
  setDefault: z.boolean().optional(),
})

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const providers = await listUserProviderKeys(locals.user.id)
  const defaultProvider = await getUserDefaultProvider(locals.user.id)

  return json({ providers, defaultProvider })
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = createProviderBodySchema.parse(await request.json())
  const provider = await upsertUserProviderKey({
    userId: locals.user.id,
    provider: body.provider,
    key: body.key,
    label: body.label,
    setDefault: body.setDefault,
  })

  return json({ provider })
}
