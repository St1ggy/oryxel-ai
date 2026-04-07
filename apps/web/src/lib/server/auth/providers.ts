import { env } from '$env/dynamic/private'

export type ConfiguredOAuthProviders = {
  google: boolean
  apple: boolean
  facebook: boolean
  vk: boolean
  wechat: boolean
  yandex: boolean
}

export function getConfiguredOAuthProviders(): ConfiguredOAuthProviders {
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    apple: Boolean(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET),
    facebook: Boolean(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET),
    vk: Boolean(env.VK_CLIENT_ID && env.VK_CLIENT_SECRET),
    wechat: Boolean(env.WECHAT_CLIENT_ID && env.WECHAT_CLIENT_SECRET),
    yandex: Boolean(env.YANDEX_CLIENT_ID && env.YANDEX_CLIENT_SECRET),
  }
}
