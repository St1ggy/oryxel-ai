import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPost } from './posts'

import type * as OryxelDatabaseModule from '@oryxel/db'

const state = vi.hoisted(() => ({
  defaultPostVisibility: 'followers',
  insertedPost: null as Record<string, unknown> | null,
}))

vi.mock('@oryxel/db', async (importOriginal) => {
  const actual = await importOriginal<typeof OryxelDatabaseModule>()

  return {
    ...actual,
    db: {
      select() {
        const builder = {
          from() {
            return builder
          },
          where() {
            return builder
          },
          async limit() {
            return [
              {
                username: 'owner',
                displayName: 'Owner',
                defaultPostVisibility: state.defaultPostVisibility,
              },
            ]
          },
        }

        return builder
      },
      insert() {
        const builder = {
          values(values: Record<string, unknown>) {
            state.insertedPost = values

            return builder
          },
          async returning() {
            return [
              {
                id: 7,
                authorId: 'user-1',
                body: state.insertedPost?.['body'],
                visibility: state.insertedPost?.['visibility'],
                createdAt: new Date('2026-08-29T00:00:00Z'),
              },
            ]
          },
        }

        return builder
      },
    },
  }
})

beforeEach(() => {
  state.defaultPostVisibility = 'followers'
  state.insertedPost = null
})

describe('createPost', () => {
  it('uses the saved visibility when the request omits one', async () => {
    state.defaultPostVisibility = 'private'

    const post = await createPost('user-1', { body: 'Private by default' })

    expect(state.insertedPost).toMatchObject({ visibility: 'private' })
    expect(post.visibility).toBe('private')
  })

  it('prefers an explicit visibility over the saved default', async () => {
    state.defaultPostVisibility = 'private'

    const post = await createPost('user-1', { body: 'Shared intentionally', visibility: 'public' })

    expect(state.insertedPost).toMatchObject({ visibility: 'public' })
    expect(post.visibility).toBe('public')
  })
})
