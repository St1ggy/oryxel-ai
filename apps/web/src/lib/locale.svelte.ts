import { browser } from '$app/environment'

import { cookieMaxAge, cookieName, getLocale, overwriteGetLocale, type Locale } from '$lib/paraglide/runtime'

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
