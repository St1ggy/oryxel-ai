<script lang="ts">
  import { Loader2 } from '@lucide/svelte'

  import * as m from '$lib/paraglide/messages.js'

  import type { PageData } from './$types'

  import { resolve } from '$app/paths'

  const { data }: { data: PageData } = $props()

  let pendingProvider = $state<string | null>(null)
  let errorText = $state<string | null>(null)

  // Social providers use /api/auth/sign-in/social
  // Yandex is registered via genericOAuth plugin → /api/auth/sign-in/oauth2
  const GENERIC_OAUTH_PROVIDERS = new Set(['yandex'])

  async function loginWith(provider: 'google' | 'apple' | 'facebook' | 'vk' | 'wechat' | 'yandex') {
    pendingProvider = provider
    errorText = null

    const isGenericOAuth = GENERIC_OAUTH_PROVIDERS.has(provider)
    const endpoint = isGenericOAuth ? '/api/auth/sign-in/oauth2' : '/api/auth/sign-in/social'
    const body = isGenericOAuth
      ? { providerId: provider, callbackURL: data.redirectTo, disableRedirect: true, requestSignUp: true }
      : { provider, callbackURL: data.redirectTo, disableRedirect: true, requestSignUp: true }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`Failed with ${response.status}`)
      }

      const payload = (await response.json()) as { url?: string }

      if (!payload.url) {
        throw new Error('Provider did not return a redirect URL')
      }

      globalThis.location.assign(payload.url)
    } catch {
      errorText = m.oryxel_login_error_start()
    } finally {
      pendingProvider = null
    }
  }

  const hasProviders = $derived(
    data.providers.google ||
      data.providers.apple ||
      data.providers.facebook ||
      data.providers.vk ||
      data.providers.wechat ||
      data.providers.yandex,
  )
</script>

<div class="relative flex min-h-svh flex-col items-center justify-center px-4 py-16">
  <!-- Brand -->
  <div class="mb-10 flex flex-col items-center text-center">
    <div
      class="mb-5 flex size-[68px] items-center justify-center rounded-[20px] text-[28px] font-black tracking-tighter shadow-[0_8px_32px_rgba(0,0,0,0.14)]"
      style="background: var(--oryx-btn-primary-bg); color: var(--oryx-btn-primary-fg)"
    >
      O
    </div>
    <h1 class="oryx-heading text-[2rem] font-bold tracking-tight text-foreground">
      {m.oryxel_brand()}
    </h1>
    <p class="mt-2 max-w-[220px] text-sm leading-relaxed text-foreground-muted">
      {m.oryxel_login_tagline()}
    </p>
  </div>

  <!-- Auth card -->
  <div class="w-full max-w-[340px]">
    {#if hasProviders}
      <div class="space-y-2.5">
        {#if data.providers.google}
          <button
            type="button"
            class="oryx-transition group relative flex h-12 w-full items-center gap-3 rounded-[14px] border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted hover:shadow-md active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50"
            onclick={() => loginWith('google')}
            disabled={pendingProvider !== null}
          >
            {#if pendingProvider === 'google'}
              <Loader2 class="size-5 shrink-0 animate-spin text-foreground-muted" />
            {:else}
              <!-- Google G logo -->
              <svg class="size-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            {/if}
            <span class="flex-1 text-center">{m.oryxel_login_continue_google()}</span>
          </button>
        {/if}

        {#if data.providers.apple}
          <button
            type="button"
            class="oryx-transition group relative flex h-12 w-full items-center gap-3 rounded-[14px] border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted hover:shadow-md active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50"
            onclick={() => loginWith('apple')}
            disabled={pendingProvider !== null}
          >
            {#if pendingProvider === 'apple'}
              <Loader2 class="size-5 shrink-0 animate-spin text-foreground-muted" />
            {:else}
              <!-- Apple logo -->
              <svg class="size-5 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.27.07 2.15.55 2.88.57 1.1-.18 2.15-.7 3.27-.63 1.37.11 2.38.57 3.08 1.53-2.8 1.6-2.13 5.29.32 6.38-.52 1.37-1.2 2.72-2.55 3.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                />
              </svg>
            {/if}
            <span class="flex-1 text-center">{m.oryxel_login_continue_apple()}</span>
          </button>
        {/if}

        {#if data.providers.yandex}
          <button
            type="button"
            class="oryx-transition group relative flex h-12 w-full items-center gap-3 rounded-[14px] border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted hover:shadow-md active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50"
            onclick={() => loginWith('yandex')}
            disabled={pendingProvider !== null}
          >
            {#if pendingProvider === 'yandex'}
              <Loader2 class="size-5 shrink-0 animate-spin text-foreground-muted" />
            {:else}
              <!-- Yandex Я badge -->
              <span
                class="flex size-5 shrink-0 items-center justify-center rounded-[5px] text-[13px] leading-none font-black text-white"
                style="background: #fc3f1d">Я</span
              >
            {/if}
            <span class="flex-1 text-center">{m.oryxel_login_continue_yandex()}</span>
          </button>
        {/if}

        {#if data.providers.vk}
          <button
            type="button"
            class="oryx-transition group relative flex h-12 w-full items-center gap-3 rounded-[14px] border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted hover:shadow-md active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50"
            onclick={() => loginWith('vk')}
            disabled={pendingProvider !== null}
          >
            {#if pendingProvider === 'vk'}
              <Loader2 class="size-5 shrink-0 animate-spin text-foreground-muted" />
            {:else}
              <!-- VK logo -->
              <svg class="size-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="#0077FF"
                  d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.049-1.714-1.033-1.01-1.49-.857-1.49-.857v1.1c0 .445-.143.714-1.305.714-1.922 0-4.056-1.166-5.558-3.34C5.372 9.995 5 8.27 5 7.97c0-.12.033-.233.098-.332h2.014c.458 0 .598.19.786.682.876 2.387 2.356 4.477 2.964 4.477.228 0 .332-.105.332-.682V9.474c-.066-1.165-.682-1.266-.682-1.683 0-.198.157-.4.398-.4h3.174c.34 0 .46.18.46.558v2.994c0 .34.148.457.243.457.228 0 .424-.117.84-.532 1.304-1.46 2.231-3.712 2.231-3.712.122-.256.333-.49.68-.49h1.744c.523 0 .637.27.523.635-.21.98-2.263 3.875-2.263 3.875-.19.307-.258.444 0 .794.19.258.808.795 1.22 1.278.756.863 1.337 1.591 1.493 2.09.142.493-.11.746-.556.746z"
                />
              </svg>
            {/if}
            <span class="flex-1 text-center">{m.oryxel_login_continue_vk()}</span>
          </button>
        {/if}

        {#if data.providers.facebook}
          <button
            type="button"
            class="oryx-transition group relative flex h-12 w-full items-center gap-3 rounded-[14px] border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted hover:shadow-md active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50"
            onclick={() => loginWith('facebook')}
            disabled={pendingProvider !== null}
          >
            {#if pendingProvider === 'facebook'}
              <Loader2 class="size-5 shrink-0 animate-spin text-foreground-muted" />
            {:else}
              <!-- Facebook logo -->
              <svg class="size-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="#1877F2"
                  d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                />
              </svg>
            {/if}
            <span class="flex-1 text-center">{m.oryxel_login_continue_facebook()}</span>
          </button>
        {/if}

        {#if data.providers.wechat}
          <button
            type="button"
            class="oryx-transition group relative flex h-12 w-full items-center gap-3 rounded-[14px] border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted hover:shadow-md active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50"
            onclick={() => loginWith('wechat')}
            disabled={pendingProvider !== null}
          >
            {#if pendingProvider === 'wechat'}
              <Loader2 class="size-5 shrink-0 animate-spin text-foreground-muted" />
            {:else}
              <!-- WeChat logo -->
              <svg class="size-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="#07C160"
                  d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c-.276-.94-.418-1.92-.418-2.93 0-3.98 3.787-7.006 8.276-7.006.157 0 .312.007.466.018C15.956 4.251 12.68 2.188 8.69 2.188zm-2.75 3.999a.982.982 0 1 1 0 1.963.982.982 0 0 1 0-1.963zm5.5 0a.982.982 0 1 1 0 1.963.982.982 0 0 1 0-1.963zm7.964 2.293c-4.056 0-7.345 2.773-7.345 6.194 0 3.422 3.29 6.195 7.345 6.195.868 0 1.698-.132 2.474-.37a.75.75 0 0 1 .622.086l1.656.969a.284.284 0 0 0 .145.047.256.256 0 0 0 .252-.256.62.62 0 0 0-.04-.185l-.34-1.29a.514.514 0 0 1 .185-.578A5.876 5.876 0 0 0 24 14.674c0-3.42-3.29-6.194-7.595-6.194zm-2.747 3.52a.854.854 0 1 1 0 1.707.854.854 0 0 1 0-1.707zm5.494 0a.854.854 0 1 1 0 1.707.854.854 0 0 1 0-1.707z"
                />
              </svg>
            {/if}
            <span class="flex-1 text-center">{m.oryxel_login_continue_wechat()}</span>
          </button>
        {/if}
      </div>
    {:else}
      <p class="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground-muted">
        {m.oryxel_login_oauth_missing()}
      </p>
    {/if}

    {#if errorText}
      <p class="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {errorText}
      </p>
    {/if}
  </div>

  <!-- Back link -->
  <!-- eslint-disable svelte/no-navigation-without-resolve -->
  <a href={resolve('/')} class="oryx-transition mt-10 text-xs text-foreground-muted hover:text-foreground">
    ← {m.oryxel_back()}
  </a>
  <!-- eslint-enable svelte/no-navigation-without-resolve -->
</div>
