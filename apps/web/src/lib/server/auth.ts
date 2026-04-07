import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'
import { genericOAuth } from 'better-auth/plugins'
import { sveltekitCookies } from 'better-auth/svelte-kit'

import { db } from '$lib/server/db'
import * as schema from '$lib/server/db/schema'

import { getRequestEvent } from '$app/server'
import { env } from '$env/dynamic/private'

const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {}

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
}

if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
  socialProviders.apple = { clientId: env.APPLE_CLIENT_ID, clientSecret: env.APPLE_CLIENT_SECRET }
}

if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
  socialProviders.facebook = { clientId: env.FACEBOOK_CLIENT_ID, clientSecret: env.FACEBOOK_CLIENT_SECRET }
}

if (env.VK_CLIENT_ID && env.VK_CLIENT_SECRET) {
  socialProviders.vk = { clientId: env.VK_CLIENT_ID, clientSecret: env.VK_CLIENT_SECRET }
}

if (env.WECHAT_CLIENT_ID && env.WECHAT_CLIENT_SECRET) {
  socialProviders.wechat = { clientId: env.WECHAT_CLIENT_ID, clientSecret: env.WECHAT_CLIENT_SECRET }
}

export const auth = betterAuth({
  baseURL: env.ORIGIN,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: false },
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
  },
  socialProviders,
  plugins: [
    ...(env.YANDEX_CLIENT_ID && env.YANDEX_CLIENT_SECRET
      ? [
          genericOAuth({
            config: [
              {
                providerId: 'yandex',
                clientId: env.YANDEX_CLIENT_ID,
                clientSecret: env.YANDEX_CLIENT_SECRET,
                authorizationUrl: 'https://oauth.yandex.com/authorize',
                tokenUrl: 'https://oauth.yandex.com/token',
                scopes: ['login:email', 'login:info'],
                getUserInfo: async (tokens) => {
                  const response = await fetch('https://login.yandex.ru/info?format=json', {
                    headers: { Authorization: `OAuth ${tokens.accessToken}` },
                  })

                  if (!response.ok) return null

                  const data = (await response.json()) as {
                    id: string
                    login: string
                    display_name?: string
                    default_email?: string
                    default_avatar_id?: string
                    is_avatar_empty?: boolean
                  }

                  return {
                    id: data.id,
                    name: data.display_name ?? data.login,
                    email: data.default_email ?? null,
                    image:
                      data.default_avatar_id && !data.is_avatar_empty
                        ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200`
                        : undefined,
                    emailVerified: true,
                  }
                },
              },
            ],
          }),
        ]
      : []),
    sveltekitCookies(getRequestEvent), // must be last
  ],
})
