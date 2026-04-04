import { type Locale, cookieMaxAge, cookieName, getLocale, overwriteGetLocale } from '$lib/paraglide/runtime'

import { browser } from '$app/environment'

class LocaleStore {
  current = $state<Locale>(browser ? getLocale() : 'en')

  set(locale: Locale) {
    this.current = locale

    if (browser) {
      document.cookie = `${cookieName}=${locale}; path=/; max-age=${cookieMaxAge}`
    }
  }
}

export const localeStore = new LocaleStore()

// On the client, make getLocale() return the reactive $state value.
// This means every {m.something()} call in any template becomes reactive to locale changes.
if (browser) {
  overwriteGetLocale(() => localeStore.current)
}
