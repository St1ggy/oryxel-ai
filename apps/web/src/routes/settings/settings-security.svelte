<script lang="ts">
  import { onMount } from 'svelte'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { ConfiguredOAuthProviders } from '$lib/server/auth/providers'

  type LinkedAccount = {
    id: string
    providerId: string
    accountId: string
    createdAt: string
  }

  const { configured }: { configured: ConfiguredOAuthProviders } = $props()

  let accounts = $state<LinkedAccount[]>([])
  let loadError = $state<string | null>(null)
  let actionError = $state<string | null>(null)
  let busyKey = $state<string | null>(null)

  const linkableSocial = $derived(
    (
      [
        ['google', configured.google],
        ['apple', configured.apple],
        ['facebook', configured.facebook],
        ['vk', configured.vk],
        ['wechat', configured.wechat],
        ['yandex', configured.yandex],
      ] as const
    ).filter(([, on]) => on),
  )

  function providerLabel(id: string): string {
    const map: Record<string, string> = {
      google: m.oryxel_login_continue_google(),
      apple: m.oryxel_login_continue_apple(),
      facebook: m.oryxel_login_continue_facebook(),
      vk: m.oryxel_login_continue_vk(),
      wechat: m.oryxel_login_continue_wechat(),
      yandex: m.oryxel_login_continue_yandex(),
    }

    return map[id] ?? id
  }

  async function refreshAccounts() {
    loadError = null

    try {
      const response = await fetch('/api/auth/list-accounts', { credentials: 'include' })

      if (!response.ok) {
        throw new Error('failed')
      }

      accounts = (await response.json()) as LinkedAccount[]
    } catch {
      loadError = m.oryxel_settings_security_load_error()
    }
  }

  onMount(() => {
    void refreshAccounts()
  })

  function isLinked(providerId: string): boolean {
    return accounts.some((account) => account.providerId === providerId)
  }

  async function linkSocial(provider: string) {
    actionError = null
    busyKey = `link:${provider}`

    try {
      const callbackURL = globalThis.location.href
      const response = await fetch('/api/auth/link-social', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, callbackURL, disableRedirect: true }),
      })

      const payload = (await response.json().catch(() => ({}))) as { url?: string; message?: string }

      if (!response.ok) {
        throw new Error(payload.message ?? `HTTP ${response.status}`)
      }

      if (payload.url) {
        globalThis.location.assign(payload.url)

        return
      }

      await refreshAccounts()
    } catch {
      actionError = m.oryxel_settings_security_link_error()
    } finally {
      busyKey = null
    }
  }

  async function unlinkAccount(account: LinkedAccount) {
    actionError = null
    busyKey = `unlink:${account.id}`

    try {
      const response = await fetch('/api/auth/unlink-account', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ providerId: account.providerId, accountId: account.accountId }),
      })

      const payload = (await response.json().catch(() => ({}))) as { message?: string }

      if (!response.ok) {
        const message = payload.message?.toLowerCase() ?? ''

        actionError =
          message.includes('fresh') || response.status === 403
            ? m.oryxel_settings_security_fresh_session()
            : m.oryxel_settings_security_unlink_error()

        return
      }

      await refreshAccounts()
    } catch {
      actionError = m.oryxel_settings_security_unlink_error()
    } finally {
      busyKey = null
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="oryx-heading text-xl font-medium tracking-tight">{m.oryxel_settings_security_title()}</h2>
    <p class="mt-2 text-sm text-foreground-muted">{m.oryxel_settings_security_email_hint()}</p>
  </div>

  {#if loadError}
    <p class="text-sm text-destructive">{loadError}</p>
  {/if}

  {#if actionError}
    <p class="text-sm text-destructive">{actionError}</p>
  {/if}

  <Card class="space-y-4 p-6">
    <h3 class="text-sm font-medium">{m.oryxel_settings_security_linked()}</h3>

    {#if accounts.length === 0}
      <p class="text-sm text-foreground-muted">{m.oryxel_settings_security_no_accounts()}</p>
    {:else}
      <ul class="space-y-3">
        {#each accounts as account (account.id)}
          <li class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
            <div>
              <div class="text-sm font-medium">{providerLabel(account.providerId)}</div>
              <div class="text-xs text-foreground-muted">
                {m.oryxel_settings_security_account_id({ id: account.accountId })}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="text-destructive hover:bg-destructive/10"
              disabled={busyKey !== null}
              onclick={() => unlinkAccount(account)}
            >
              {busyKey === `unlink:${account.id}` ? '…' : m.oryxel_settings_security_unlink()}
            </Button>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>

  <Card class="space-y-4 p-6">
    <h3 class="text-sm font-medium">{m.oryxel_settings_security_add_provider()}</h3>
    <p class="text-sm text-foreground-muted">{m.oryxel_settings_security_link_hint()}</p>

    <div class="flex flex-wrap gap-2">
      {#each linkableSocial as [provider] (provider)}
        {#if !isLinked(provider)}
          <Button variant="secondary" size="sm" disabled={busyKey !== null} onclick={() => linkSocial(provider)}>
            {busyKey === `link:${provider}`
              ? '…'
              : m.oryxel_settings_security_link({ provider: providerLabel(provider) })}
          </Button>
        {/if}
      {/each}
    </div>
  </Card>
</div>
