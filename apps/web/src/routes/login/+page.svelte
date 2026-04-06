<script lang="ts">
  import { Loader2 } from '@lucide/svelte'

  import * as m from '$lib/paraglide/messages.js'

  import type { PageData } from './$types'

  import { resolve } from '$app/paths'

  const { data }: { data: PageData } = $props()

  let pendingProvider = $state<string | null>(null)
  let errorText = $state<string | null>(null)

  async function loginWith(provider: 'google' | 'apple') {
    pendingProvider = provider
    errorText = null

    try {
      const response = await fetch('/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider,
          callbackURL: data.redirectTo,
          disableRedirect: true,
          requestSignUp: true,
        }),
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

  const hasProviders = $derived(data.providers.google || data.providers.apple)
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
