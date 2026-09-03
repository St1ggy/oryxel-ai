import { describe, expect, it } from 'vitest'

import { canDiscover, canView, resolveVisibility, shouldNotifyFollowers } from './visibility'

describe('social visibility', () => {
  it('allows direct unlisted links without making them discoverable', async () => {
    await expect(canView(null, 'owner', 'unlisted')).resolves.toBe(true)
    await expect(canDiscover(null, 'owner', 'unlisted')).resolves.toBe(false)
    await expect(canDiscover('owner', 'owner', 'unlisted')).resolves.toBe(true)
  })

  it('notifies followers only for follower and public content', () => {
    expect(shouldNotifyFollowers('private')).toBe(false)
    expect(shouldNotifyFollowers('unlisted')).toBe(false)
    expect(shouldNotifyFollowers('followers')).toBe(true)
    expect(shouldNotifyFollowers('public')).toBe(true)
  })

  it('uses a valid saved default only when visibility is omitted', () => {
    expect(resolveVisibility('private', 'public', 'followers')).toBe('private')
    expect(resolveVisibility(undefined, 'unlisted', 'followers')).toBe('unlisted')
    expect(resolveVisibility(undefined, 'invalid', 'followers')).toBe('followers')
  })
})
