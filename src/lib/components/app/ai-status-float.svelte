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

  type SyncPhase = 'owned' | 'liked' | 'disliked' | 'profile' | 'recommendations' | 'to_try'
  type SyncProgress = { step: number; total: number; phase: SyncPhase }
  type PatchProgress = { step: number; total: number }

  type Props = {
    thinking?: boolean
    patches?: PendingPatch[]
    syncProgress?: SyncProgress | null
    patchProgress?: PatchProgress | null
  }

  const { thinking = false, patches = [], syncProgress = null, patchProgress = null }: Props = $props()

  const pendingPatches = $derived(patches.filter((p) => p.status === 'created'))
  const visible = $derived(thinking || pendingPatches.length > 0 || syncProgress !== null || patchProgress !== null)

  function phaseLabel(phase: SyncPhase): string {
    if (phase === 'owned') return m.oryxel_sync_phase_owned()

    if (phase === 'liked') return m.oryxel_sync_phase_liked()

    if (phase === 'disliked') return m.oryxel_sync_phase_disliked()

    if (phase === 'profile') return m.oryxel_sync_phase_profile()

    if (phase === 'to_try') return m.oryxel_sync_phase_to_try()

    return m.oryxel_sync_phase_recommendations()
  }

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
    class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-84 flex-col gap-2.5 md:right-6 md:bottom-6"
    in:fly={{ y: 12, duration: 220, opacity: 0 }}
    out:fly={{ y: 12, duration: 180, opacity: 0 }}
  >
    {#if patchProgress}
      <div
        class="pointer-events-auto rounded-2xl border border-accent/30 bg-surface px-4 py-3.5 shadow-2xl ring-1 ring-accent/10"
        in:fly={{ y: 8, duration: 180 }}
        out:fly={{ y: 8, duration: 140 }}
      >
        <div class="mb-2.5 flex items-center justify-between">
          <span class="text-sm font-semibold text-foreground">{m.oryxel_patch_applying()}</span>
          <span class="text-xs font-medium text-accent">{patchProgress.step}/{patchProgress.total}</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            class="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            style="width: {Math.round((patchProgress.step / patchProgress.total) * 100)}%"
          ></div>
        </div>
      </div>
    {/if}

    {#if syncProgress}
      <div
        class="pointer-events-auto rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-2xl ring-1 ring-black/5"
        in:fly={{ y: 8, duration: 180 }}
        out:fly={{ y: 8, duration: 140 }}
      >
        <div class="mb-2.5 flex items-center justify-between">
          <span class="text-sm font-semibold text-foreground">{m.oryxel_profile_sync()}</span>
          <span class="text-xs font-medium text-foreground-muted">{syncProgress.step}/{syncProgress.total}</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            class="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style="width: {Math.round((syncProgress.step / syncProgress.total) * 100)}%"
          ></div>
        </div>
        <p class="mt-2 text-xs text-foreground-muted">{phaseLabel(syncProgress.phase)}</p>
      </div>
    {/if}

    {#if thinking}
      <div
        class="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-2xl ring-1 ring-black/5"
        in:fly={{ y: 8, duration: 180 }}
        out:fly={{ y: 8, duration: 140 }}
      >
        <span class="flex shrink-0 gap-1">
          {#each [0, 1, 2] as index (index)}
            <span class="size-2 animate-pulse rounded-full bg-accent" style="animation-delay: {index * 0.15}s"></span>
          {/each}
        </span>
        <span class="text-sm font-medium text-foreground">{m.oryxel_chat_preparing()}</span>
      </div>
    {/if}

    {#each pendingPatches as patch (patch.id)}
      <div
        class="pointer-events-auto rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-2xl ring-1 ring-black/5"
        in:fly={{ y: 8, duration: 200 }}
        out:fly={{ y: 8, duration: 160 }}
      >
        <p class="text-sm font-semibold text-foreground">{m.oryxel_pending_title()}</p>
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
