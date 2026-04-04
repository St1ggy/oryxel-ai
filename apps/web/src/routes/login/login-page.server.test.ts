import { describe, expect, it } from 'vitest'

import { load } from './+page.server'

describe('login page server load', () => {
  it('uses /diary as default redirect target', async () => {
    const data = (await load({
      locals: {},
      url: new URL('http://localhost/login'),
    } as never)) as { redirectTo: string }

    expect(data.redirectTo).toBe('/diary')
  })

  it('sanitizes unsafe redirect targets', async () => {
    const data = (await load({
      locals: {},
      url: new URL('http://localhost/login?redirectTo=https://evil.example'),
    } as never)) as { redirectTo: string }

    expect(data.redirectTo).toBe('/')
  })
})
