<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { fly } from 'svelte/transition'

  import * as m from '$lib/paraglide/messages.js'

  type PendingPatch = {
    id: number
    summary: string | null
    status: string
    patchType: string
  }

  type Props = {
    thinking?: boolean
    patches?: PendingPatch[]
  }

  const { thinking = false, patches = [] }: Props = $props()

  const pendingPatches = $derived(patches.filter((p) => p.status === 'created'))
  const visible = $derived(thinking || pendingPatches.length > 0)

  let busyId = $state<number | null>(null)

  async function submitDecision(patchId: number, decision: 'confirm' | 'reject') {
    busyId = patchId
    try {
      await fetch('/api/agent/preferences/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ patchId, decision }),
      })
      await invalidateAll()
    } finally {
      busyId = null
    }
  }
</script>

{#if visible}
  <div
    class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2 md:right-6 md:bottom-6"
    in:fly={{ y: 12, duration: 220, opacity: 0 }}
    out:fly={{ y: 12, duration: 180, opacity: 0 }}
  >
    {#if thinking}
      <div
        class="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-surface/90 px-4 py-3 shadow-lg backdrop-blur-md"
        in:fly={{ y: 8, duration: 180 }}
        out:fly={{ y: 8, duration: 140 }}
      >
        <span class="flex shrink-0 gap-1">
          {#each [0, 1, 2] as index (index)}
            <span
              class="size-1.5 animate-pulse rounded-full bg-accent opacity-70"
              style="animation-delay: {index * 0.15}s"
            ></span>
          {/each}
        </span>
        <span class="text-sm text-foreground-muted">{m.oryxel_chat_preparing()}</span>
      </div>
    {/if}

    {#each pendingPatches as patch (patch.id)}
      <div
        class="pointer-events-auto rounded-2xl border border-border bg-surface/90 px-4 py-3 shadow-lg backdrop-blur-md"
        in:fly={{ y: 8, duration: 200 }}
        out:fly={{ y: 8, duration: 160 }}
      >
        <p class="text-sm font-medium text-foreground">{m.oryxel_pending_title()}</p>
        <p class="mt-1 text-sm text-foreground-muted">{patch.summary ?? m.oryxel_pending_fallback_summary()}</p>
        <div class="mt-3 flex items-center gap-2">
          <button
            type="button"
            class="oryx-transition oryx-btn-primary rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            disabled={busyId !== null}
            onclick={() => submitDecision(patch.id, 'confirm')}
          >
            {m.oryxel_action_confirm()}
          </button>
          <button
            type="button"
            class="oryx-transition rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted hover:border-border-strong hover:text-foreground disabled:opacity-50"
            disabled={busyId !== null}
            onclick={() => submitDecision(patch.id, 'reject')}
          >
            {m.oryxel_action_reject()}
          </button>
        </div>
      </div>
    {/each}
  </div>
{/if}
