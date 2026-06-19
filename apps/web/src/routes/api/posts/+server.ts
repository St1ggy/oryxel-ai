import { createJob, createPost } from '@oryxel/ai/server'
import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  body: z.string().min(1).max(4000),
  visibility: z.enum(['private', 'followers', 'public', 'unlisted']).optional(),
  attachments: z
    .array(
      z.object({
        kind: z.string(),
        entityId: z.number().int().optional(),
        url: z.string().url().optional(),
      }),
    )
    .optional(),
})

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401, 'AUTH_REQUIRED')

  const body = bodySchema.parse(await request.json())
  const post = await createPost(locals.user.id, body)

  if (body.visibility !== 'private') {
    await createJob(locals.user.id, 'notify_post', { postId: post.id, authorId: locals.user.id })
  }

  return json({ post }, { status: 201 })
}
