export function getLegacyLocaleRedirect(url: URL) {
  if (url.pathname !== '/jp' && !url.pathname.startsWith('/jp/')) return null

  const redirectUrl = new URL(url)

  redirectUrl.pathname = `/ja${url.pathname.slice(3)}`

  return new Response(null, { status: 308, headers: { location: redirectUrl.toString() } })
}

export function rewriteLegacyLocaleCookieHeader(cookieHeader: string | null, cookieName: string) {
  if (cookieHeader === null) return null

  let changed = false
  const cookies = cookieHeader.split(';').map((segment) => {
    const [name, ...valueParts] = segment.trim().split('=')
    const value = valueParts.join('=')

    if (name !== cookieName || value !== 'jp') return segment.trim()

    changed = true

    return `${name}=ja`
  })

  return changed ? cookies.join('; ') : cookieHeader
}
