<script lang="ts">
  import { ChevronUp } from '@lucide/svelte'
  import { fly, slide } from 'svelte/transition'

  import * as m from '$lib/paraglide/messages.js'

  import { invalidateAll } from '$app/navigation'

  type PendingPatch = {
    id: number
    summary: string | null
    status: string
    patchType: string
    payload?: Record<string, unknown> | null
  }

  type SyncPhase = 'owned' | 'liked' | 'disliked' | 'profile' | 'recommendations' | 'to_try'
  type SyncProgress = { step: number; total: number; phase: SyncPhase }
  type PatchProgress = { step: number; total: number }

  type Props = {
    thinking?: boolean
    patches?: PendingPatch[]
    syncProgress?: SyncProgress | null
    patchProgress?: PatchProgress | null
    // When true, renders as a plain block at the bottom of its parent (desktop use).
    // When false (default), renders as a fixed overlay above the mobile nav.
    inline?: boolean
    onOpenPatchDetails?: (payload: Record<string, unknown>, summary: string | null) => void
    /** After user confirms and server applies the patch. */
    onPatchApplied?: (summary: string, payload: Record<string, unknown>) => void
  }

  const {
    thinking = false,
    patches = [],
    syncProgress = null,
    patchProgress = null,
    inline = false,
    onOpenPatchDetails,
    onPatchApplied,
  }: Props = $props()

  const pendingPatches = $derived(patches.filter((p) => p.status === 'created'))
  const activeProgress = $derived(patchProgress ?? syncProgress)
  const progressPercent = $derived(activeProgress ? Math.round((activeProgress.step / activeProgress.total) * 100) : 0)
  const isProgressActive = $derived(!!patchProgress || !!syncProgress)
  const visible = $derived(thinking || pendingPatches.length > 0 || isProgressActive)

  // Mobile-only: collapsed by default; auto-expands when patches arrive
  let collapsed = $state(true)

  $effect(() => {
    if (pendingPatches.length > 0) collapsed = false
  })

  function phaseLabel(phase: SyncPhase): string {
    if (phase === 'owned') return m.oryxel_sync_phase_owned()

    if (phase === 'liked') return m.oryxel_sync_phase_liked()

    if (phase === 'disliked') return m.oryxel_sync_phase_disliked()

    if (phase === 'profile') return m.oryxel_sync_phase_profile()

    if (phase === 'to_try') return m.oryxel_sync_phase_to_try()

    return m.oryxel_sync_phase_recommendations()
  }

  function getStatusLabel(): string {
    if (patchProgress) return m.oryxel_patch_applying()

    if (syncProgress) return `${m.oryxel_profile_sync()} — ${phaseLabel(syncProgress.phase)}`

    if (thinking) return m.oryxel_chat_preparing()

    return ''
  }

  const statusLabel = $derived(getStatusLabel())

  let busyId = $state<number | null>(null)

  async function submitDecision(patch: PendingPatch, decision: 'confirm' | 'reject') {
    busyId = patch.id
    try {
      const response = await fetch('/api/agent/preferences/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ patchId: patch.id, decision }),
      })
      const data = (await response.json().catch(() => null)) as {
        status?: string
        appliedPatch?: Record<string, unknown>
      } | null

      if (!response.ok) {
        await invalidateAll()

        return
      }

      if (decision === 'confirm' && data?.status === 'applied' && onPatchApplied) {
        const payload =
          data.appliedPatch ??
          (patch.payload && typeof patch.payload === 'object' ? patch.payload : ({} as Record<string, unknown>))

        onPatchApplied(patch.summary ?? '', payload)
      }

      await invalidateAll()
    } finally {
      busyId = null
    }
  }
</script>

{#if visible}
  {#if inline}
    <!-- Desktop: plain block at the bottom of the right panel, no overlay -->
    <div in:fly={{ y: 8, duration: 220, opacity: 0 }} out:fly={{ y: 8, duration: 180, opacity: 0 }}>
      {#each pendingPatches as patch (patch.id)}
        <div class="border-t border-border bg-surface" in:slide={{ duration: 200 }} out:slide={{ duration: 160 }}>
          <div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <p class="min-w-0 flex-1 text-sm text-foreground">
              <span class="font-medium">{m.oryxel_pending_title()}</span>
              &nbsp;—&nbsp;
              {patch.summary ?? m.oryxel_pending_fallback_summary()}
            </p>
            <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {#if onOpenPatchDetails}
                <button
                  type="button"
                  class="oryx-transition rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground-muted hover:border-border-strong hover:text-foreground disabled:opacity-50"
                  disabled={busyId !== null}
                  onclick={() =>
                    onOpenPatchDetails(
                      (patch.payload && typeof patch.payload === 'object' ? patch.payload : {}) as Record<
                        string,
                        unknown
                      >,
                      patch.summary,
                    )}
                >
                  {m.oryxel_patch_details_cta()}
                </button>
              {/if}
              <button
                type="button"
                class="oryx-transition oryx-btn-primary rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                disabled={busyId !== null}
                onclick={() => submitDecision(patch, 'confirm')}
              >
                {m.oryxel_action_confirm()}
              </button>
              <button
                type="button"
                class="oryx-transition rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted hover:border-border-strong hover:text-foreground disabled:opacity-50"
                disabled={busyId !== null}
                onclick={() => submitDecision(patch, 'reject')}
              >
                {m.oryxel_action_reject()}
              </button>
            </div>
          </div>
        </div>
      {/each}

      {#if isProgressActive || thinking}
        <div class="border-t border-border bg-surface">
          <div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
            {#if thinking && !isProgressActive}
              <span class="flex shrink-0 gap-1">
                {#each [0, 1, 2] as index (index)}
                  <span class="size-1.5 animate-pulse rounded-full bg-accent" style="animation-delay: {index * 0.15}s"
                  ></span>
                {/each}
              </span>
            {/if}
            <span class="flex-1 truncate text-sm text-foreground-muted">{statusLabel}</span>
            {#if activeProgress}
              <span class="shrink-0 text-xs font-medium text-foreground-muted tabular-nums">
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
  {:else}
    <!-- Mobile: collapsible fixed panel above the bottom nav -->
    <div
      class="fixed right-0 bottom-16 left-0 z-50"
      in:fly={{ y: 16, duration: 220, opacity: 0 }}
      out:fly={{ y: 16, duration: 180, opacity: 0 }}
    >
      <!-- Expanded content (patch cards + progress) -->
      {#if !collapsed}
        <div transition:slide={{ duration: 200 }}>
          {#each pendingPatches as patch (patch.id)}
            <div class="border-t border-border bg-surface">
              <div class="flex items-start gap-3 px-4 py-3">
                <p class="min-w-0 flex-1 text-sm text-foreground">
                  <span class="font-medium">{m.oryxel_pending_title()}</span>
                  <br />
                  <span class="text-foreground-muted">{patch.summary ?? m.oryxel_pending_fallback_summary()}</span>
                </p>
                <div class="flex shrink-0 flex-col gap-1.5 pt-0.5">
                  {#if onOpenPatchDetails}
                    <button
                      type="button"
                      class="oryx-transition rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground-muted disabled:opacity-50"
                      disabled={busyId !== null}
                      onclick={() =>
                        onOpenPatchDetails(
                          (patch.payload && typeof patch.payload === 'object' ? patch.payload : {}) as Record<
                            string,
                            unknown
                          >,
                          patch.summary,
                        )}
                    >
                      {m.oryxel_patch_details_cta()}
                    </button>
                  {/if}
                  <button
                    type="button"
                    class="oryx-transition oryx-btn-primary rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    disabled={busyId !== null}
                    onclick={() => submitDecision(patch, 'confirm')}
                  >
                    {m.oryxel_action_confirm()}
                  </button>
                  <button
                    type="button"
                    class="oryx-transition rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted disabled:opacity-50"
                    disabled={busyId !== null}
                    onclick={() => submitDecision(patch, 'reject')}
                  >
                    {m.oryxel_action_reject()}
                  </button>
                </div>
              </div>
            </div>
          {/each}

          {#if isProgressActive}
            <div class="border-t border-border bg-surface">
              <div class="flex items-center gap-3 px-4 py-2.5">
                <span class="flex-1 truncate text-sm text-foreground-muted">{statusLabel}</span>
                <span class="shrink-0 text-xs font-medium text-foreground-muted tabular-nums">
                  {activeProgress?.step}/{activeProgress?.total}
                </span>
              </div>
              <div class="h-0.5 w-full bg-border">
                <div
                  class="h-full bg-accent transition-[width] duration-500 ease-out"
                  style="width: {progressPercent}%"
                ></div>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Handle bar: always visible, tap to toggle -->
      <button
        type="button"
        class="flex w-full items-center gap-3 border-t border-border bg-surface px-4 py-2.5 text-left"
        onclick={() => (collapsed = !collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? m.oryxel_status_expand() : m.oryxel_status_collapse()}
      >
        {#if collapsed}
          <!-- Collapsed: show compact status summary -->
          {#if thinking && !isProgressActive}
            <span class="flex shrink-0 gap-1">
              {#each [0, 1, 2] as index (index)}
                <span class="size-1.5 animate-pulse rounded-full bg-accent" style="animation-delay: {index * 0.15}s"
                ></span>
              {/each}
            </span>
          {:else if isProgressActive}
            <span class="shrink-0 text-xs font-semibold text-accent tabular-nums">{progressPercent}%</span>
          {/if}
          <span class="min-w-0 flex-1 truncate text-sm text-foreground-muted">{statusLabel}</span>
          {#if pendingPatches.length > 0}
            <span class="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums">
              {pendingPatches.length}
            </span>
          {/if}
        {:else}
          <!-- Expanded: just a collapse label -->
          <span class="flex-1 text-xs text-foreground-muted">{m.oryxel_status_collapse()}</span>
        {/if}

        <!-- Chevron -->
        <ChevronUp
          class="size-4 shrink-0 text-foreground-muted transition-transform duration-200 {collapsed
            ? ''
            : 'rotate-180'}"
        />
      </button>

      <!-- Mini progress bar under the handle (collapsed only) -->
      {#if collapsed && isProgressActive}
        <div class="h-0.5 w-full bg-border">
          <div
            class="h-full bg-accent transition-[width] duration-500 ease-out"
            style="width: {progressPercent}%"
          ></div>
        </div>
      {/if}
    </div>
  {/if}
{/if}
