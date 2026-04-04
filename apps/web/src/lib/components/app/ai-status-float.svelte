<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { fly, slide } from 'svelte/transition'

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
  const activeProgress = $derived(patchProgress ?? syncProgress)
  const progressPercent = $derived(activeProgress ? Math.round((activeProgress.step / activeProgress.total) * 100) : 0)
  const isProgressActive = $derived(!!patchProgress || !!syncProgress)
  const visible = $derived(thinking || pendingPatches.length > 0 || isProgressActive)

  function phaseLabel(phase: SyncPhase): string {
    if (phase === 'owned') return m.oryxel_sync_phase_owned()
    if (phase === 'liked') return m.oryxel_sync_phase_liked()
    if (phase === 'disliked') return m.oryxel_sync_phase_disliked()
    if (phase === 'profile') return m.oryxel_sync_phase_profile()
    if (phase === 'to_try') return m.oryxel_sync_phase_to_try()
    return m.oryxel_sync_phase_recommendations()
  }

  const statusLabel = $derived(
    patchProgress
      ? m.oryxel_patch_applying()
      : syncProgress
        ? `${m.oryxel_profile_sync()} — ${phaseLabel(syncProgress.phase)}`
        : thinking
          ? m.oryxel_chat_preparing()
          : '',
  )

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
    class="fixed right-0 bottom-16 left-0 z-50 md:bottom-0"
    in:fly={{ y: 16, duration: 220, opacity: 0 }}
    out:fly={{ y: 16, duration: 180, opacity: 0 }}
  >
    <!-- Patch confirmation cards -->
    {#each pendingPatches as patch (patch.id)}
      <div
        class="border-t border-border bg-surface"
        in:slide={{ duration: 200 }}
        out:slide={{ duration: 160 }}
      >
        <div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <p class="min-w-0 flex-1 text-sm text-foreground">
            <span class="font-medium">{m.oryxel_pending_title()}</span>
            {' — '}
            {patch.summary ?? m.oryxel_pending_fallback_summary()}
          </p>
          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              class="oryx-transition oryx-btn-primary rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              disabled={busyId !== null}
              onclick={() => submitDecision(patch.id, 'confirm')}
            >
              {m.oryxel_action_confirm()}
            </button>
            <button
              type="button"
              class="oryx-transition rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted hover:border-border-strong hover:text-foreground disabled:opacity-50"
              disabled={busyId !== null}
              onclick={() => submitDecision(patch.id, 'reject')}
            >
              {m.oryxel_action_reject()}
            </button>
          </div>
        </div>
      </div>
    {/each}

    <!-- Progress / thinking status bar -->
    {#if isProgressActive || thinking}
      <div class="border-t border-border bg-surface">
        <div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          {#if thinking && !isProgressActive}
            <span class="flex shrink-0 gap-1">
              {#each [0, 1, 2] as index (index)}
                <span
                  class="size-1.5 animate-pulse rounded-full bg-accent"
                  style="animation-delay: {index * 0.15}s"
                ></span>
              {/each}
            </span>
          {/if}
          <span class="flex-1 truncate text-sm text-foreground-muted">{statusLabel}</span>
          {#if activeProgress}
            <span class="shrink-0 text-xs font-medium tabular-nums text-foreground-muted">
              {activeProgress.step}/{activeProgress.total}
            </span>
          {/if}
        </div>
        {#if isProgressActive}
          <div class="h-0.5 w-full bg-border">
            <div
              class="h-full bg-accent transition-[width] duration-500 ease-out"
              style="width: {progressPercent}%"
            ></div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
