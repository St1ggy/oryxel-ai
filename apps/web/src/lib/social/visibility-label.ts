import * as m from '$lib/paraglide/messages.js'

import type { Visibility } from '@oryxel/ai'

export function visibilityLabel(visibility: Visibility) {
  switch (visibility) {
    case 'private': {
      return m.oryxel_visibility_private()
    }

    case 'followers': {
      return m.oryxel_visibility_followers()
    }

    case 'public': {
      return m.oryxel_visibility_public()
    }

    case 'unlisted': {
      return m.oryxel_visibility_unlisted()
    }
  }
}

export const visibilitySelectOptions = () => [
  { value: 'private', label: visibilityLabel('private') },
  { value: 'followers', label: visibilityLabel('followers') },
  { value: 'public', label: visibilityLabel('public') },
  { value: 'unlisted', label: visibilityLabel('unlisted') },
]
