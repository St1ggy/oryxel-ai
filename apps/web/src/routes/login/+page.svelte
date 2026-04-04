<script lang="ts">
  import { resolve } from '$app/paths'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { PageData } from './$types'

  const { data }: { data: PageData } = $props()

  let pendingProvider = $state<string | null>(null)
  let errorText = $state<string | null>(null)

  function intentHref(intent: 'signin' | 'signup'): string {
    const query = `?redirectTo=${encodeURIComponent(data.redirectTo)}&intent=${intent}`

    return resolve('/login') + query
  }

  async function loginWith(provider: 'google' | 'apple' | 'yandex') {
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
          requestSignUp: data.intent === 'signup',
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
</script>

<div class="mx-auto flex min-h-[calc(100svh-72px)] w-full max-w-[560px] items-center px-4 py-10">
  <Card class="w-full space-y-5 rounded-3xl p-6 md:p-8">
    <div class="space-y-2">
      <h1 class="oryx-heading text-2xl font-semibold">
        {data.intent === 'signup' ? m.oryxel_login_title_signup() : m.oryxel_login_title_signin()}
      </h1>
      <p class="text-sm text-foreground-muted">
        {data.intent === 'signup' ? m.oryxel_login_desc_signup() : m.oryxel_login_desc_signin()}
      </p>
    </div>

    <div class="flex items-center gap-2 text-xs">
      <a class="oryx-transition text-foreground-muted hover:text-foreground" href={intentHref('signin')}>
        {m.oryxel_login_switch_signin()}
      </a>
      <span class="text-foreground-muted">/</span>
      <a class="oryx-transition text-foreground-muted hover:text-foreground" href={intentHref('signup')}>
        {m.oryxel_login_switch_signup()}
      </a>
    </div>

    <div class="space-y-3">
      {#if data.providers.google}
        <Button class="w-full justify-center" onclick={() => loginWith('google')} disabled={pendingProvider !== null}>
          {m.oryxel_login_continue_google()}
        </Button>
      {/if}
      {#if data.providers.apple}
        <Button
          variant="secondary"
          class="w-full justify-center"
          onclick={() => loginWith('apple')}
          disabled={pendingProvider !== null}
        >
          {m.oryxel_login_continue_apple()}
        </Button>
      {/if}
      {#if data.providers.yandex}
        <Button
          variant="secondary"
          class="w-full justify-center"
          onclick={() => loginWith('yandex')}
          disabled={pendingProvider !== null}
        >
          {m.oryxel_login_continue_yandex()}
        </Button>
      {/if}
    </div>

    {#if !data.providers.google && !data.providers.apple && !data.providers.yandex}
      <p class="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground-muted">
        {m.oryxel_login_oauth_missing()}
      </p>
    {/if}

    {#if errorText}
      <p class="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {errorText}
      </p>
    {/if}
  </Card>
</div>
