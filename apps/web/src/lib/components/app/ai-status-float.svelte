<script lang="ts">
  import { ChevronDown, ChevronUp } from '@lucide/svelte'
  import { fly, slide } from 'svelte/transition'

  import PhantomUiShell from '$lib/components/ui/phantom-ui-shell.svelte'
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
  type SyncProgress = {
    step: number
    total: number
    phase: SyncPhase
  }
  type PatchProgress = {
    step: number
    total: number
  }
  type ProgressMeta = {
    provider?: string
    model?: string
    tokensIn?: number
    tokensOut?: number
    attempt?: number
    durationMs?: number
    scenario?: string
    note?: string
  }
  type ProgressEvent = {
    step: number
    total: number
    phase: string
    meta?: ProgressMeta
  }

  type Props = {
    /** Pending patches / progress not loaded yet */
    loading?: boolean
    thinking?: boolean
    patches?: PendingPatch[]
    syncProgress?: SyncProgress | null
    patchProgress?: PatchProgress | null
    /** Full ordered phase event log for the current job (for the expandable timeline). */
    progressEvents?: ProgressEvent[]
    // When true, renders as a plain block at the bottom of its parent (desktop use).
    // When false (default), renders as a fixed overlay above the mobile nav.
    inline?: boolean
    onOpenPatchDetails?: (payload: Record<string, unknown>, summary: string | null) => void
    /** After user confirms and server applies the patch. */
    onPatchApplied?: (summary: string, payload: Record<string, unknown>) => void
  }

  const {
    loading = false,
    thinking = false,
    patches = [],
    syncProgress = null,
    patchProgress = null,
    progressEvents = [],
    inline = false,
    onOpenPatchDetails,
    onPatchApplied,
  }: Props = $props()

  const pendingPatches = $derived(patches.filter((p) => p.status === 'created'))
  const activeProgress = $derived(patchProgress ?? syncProgress)
  const progressPercent = $derived(activeProgress ? Math.round((activeProgress.step / activeProgress.total) * 100) : 0)
  const isProgressActive = $derived(!!patchProgress || !!syncProgress)
  const visible = $derived(loading || thinking || pendingPatches.length > 0 || isProgressActive)

  // Mobile-only: collapsed by default; auto-expands when patches arrive
  let collapsed = $state(true)
  // Phase timeline: hidden by default in both layouts, user can expand
  let timelineOpen = $state(false)

  $effect(() => {
    if (pendingPatches.length > 0) collapsed = false
  })

  function phaseLabel(phase: string) {
    switch (phase) {
      case 'owned': {
        return m.oryxel_sync_phase_owned()
      }

      case 'liked': {
        return m.oryxel_sync_phase_liked()
      }

      case 'disliked': {
        return m.oryxel_sync_phase_disliked()
      }

      case 'profile': {
        return m.oryxel_sync_phase_profile()
      }

      case 'to_try': {
        return m.oryxel_sync_phase_to_try()
      }

      case 'recommendations': {
        return m.oryxel_sync_phase_recommendations()
      }

      case 'neutral': {
        return m.oryxel_sync_phase_neutral?.() ?? 'Neutral'
      }

      case 'validate': {
        return m.oryxel_phase_validate?.() ?? 'Validate'
      }

      case 'load_context': {
        return m.oryxel_phase_load_context?.() ?? 'Load context'
      }

      case 'build_prompt': {
        return m.oryxel_phase_build_prompt?.() ?? 'Build prompt'
      }

      case 'model_call': {
        return m.oryxel_phase_model_call?.() ?? 'Model call'
      }

      case 'parse': {
        return m.oryxel_phase_parse?.() ?? 'Parse'
      }

      case 'apply_profile': {
        return m.oryxel_phase_apply_profile?.() ?? 'Apply profile'
      }

      case 'apply_ops': {
        return m.oryxel_phase_apply_ops?.() ?? 'Apply ops'
      }

      case 'apply_recs': {
        return m.oryxel_phase_apply_recs?.() ?? 'Apply recommendations'
      }

      case 'translate': {
        return m.oryxel_phase_translate?.() ?? 'Translate'
      }

      case 'analyzing': {
        return m.oryxel_phase_analyzing?.() ?? 'Analyzing'
      }

      case 'applying': {
        return m.oryxel_patch_applying()
      }

      default: {
        return phase
      }
    }
  }

  function getStatusLabel() {
    if (patchProgress) return m.oryxel_patch_applying()

    if (syncProgress) return `${m.oryxel_profile_sync()} — ${phaseLabel(syncProgress.phase)}`

    if (thinking) return m.oryxel_chat_preparing()

    return ''
  }

  const statusLabel = $derived(getStatusLabel())

  /** Collapse the event log into one row per phase (latest event wins). */
  type PhaseSummary = {
    phase: string
    step: number
    total: number
    meta?: ProgressMeta
    done: boolean
  }

  function summarizePhases(events: ProgressEvent[]) {
    if (events.length === 0) return []

    // Plain Map: this is a non-reactive helper consuming a snapshot of progressEvents.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const byPhase = new Map<string, PhaseSummary>()
    const order: string[] = []

    for (const event of events) {
      if (!byPhase.has(event.phase)) order.push(event.phase)

      const existing = byPhase.get(event.phase)
      const note = event.meta?.note ?? ''
      const done = note.includes('done') || existing?.done === true

      byPhase.set(event.phase, {
        phase: event.phase,
        step: event.step,
        total: event.total,
        meta: { ...existing?.meta, ...event.meta },
        done,
      })
    }

    return order.map((phase) => byPhase.get(phase)!)
  }

  function activePhaseId(events: ProgressEvent[]) {
    return events.at(-1)?.phase ?? null
  }

  const phaseTimeline = $derived(summarizePhases(progressEvents))
  const currentPhase = $derived(activePhaseId(progressEvents))
  const showTimeline = $derived(progressEvents.length > 0)
  const latestMeta = $derived(progressEvents.at(-1)?.meta)

  function formatDuration(ms: number | undefined) {
    if (!ms || ms < 0) return ''

    if (ms < 1000) return `${ms}ms`

    return `${(ms / 1000).toFixed(1)}s`
  }

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

{#snippet timelineBlock()}
  {#if showTimeline}
    <div class="border-t border-border bg-surface">
      <button
        type="button"
        class="oryx-transition flex w-full items-center justify-between px-4 py-2 text-xs text-foreground-muted hover:text-foreground"
        onclick={() => (timelineOpen = !timelineOpen)}
        aria-expanded={timelineOpen}
      >
        <span>{m.oryxel_phase_details?.() ?? 'Details'}</span>
        {#if timelineOpen}
          <ChevronUp class="size-3.5" />
        {:else}
          <ChevronDown class="size-3.5" />
        {/if}
      </button>
      {#if timelineOpen}
        <ul class="space-y-1 px-4 pb-3 text-xs" transition:slide={{ duration: 160 }}>
          {#each phaseTimeline as item (item.phase)}
            {@const isActive = item.phase === currentPhase && !item.done}
            <li class="flex items-center gap-2">
              <span class="inline-flex size-4 shrink-0 items-center justify-center text-[10px]">
                {#if item.done}
                  <span class="text-accent">✓</span>
                {:else if isActive}
                  <span class="size-2 animate-pulse rounded-full bg-accent"></span>
                {:else}
                  <span class="text-foreground-muted">○</span>
                {/if}
              </span>
              <span class="flex-1 truncate {isActive ? 'text-foreground' : 'text-foreground-muted'}">
                {phaseLabel(item.phase)}
                {#if item.meta?.note && !item.meta.note.includes('done')}
                  <span class="text-foreground-muted/70"> · {item.meta.note}</span>
                {/if}
              </span>
              {#if item.meta?.durationMs}
                <span class="shrink-0 text-foreground-muted/80 tabular-nums"
                  >{formatDuration(item.meta.durationMs)}</span
                >
              {/if}
            </li>
          {/each}
        </ul>
        {#if latestMeta && (latestMeta.provider || latestMeta.model || latestMeta.tokensOut)}
          <div class="border-t border-border/50 px-4 py-2 text-[10px] text-foreground-muted/80">
            <span class="font-mono">
              {#if latestMeta.provider}{latestMeta.provider}{/if}
              {#if latestMeta.model}
                · {latestMeta.model}{/if}
              {#if latestMeta.tokensOut}
                · {latestMeta.tokensOut}t{/if}
              {#if latestMeta.attempt && latestMeta.attempt > 1}
                · attempt {latestMeta.attempt}{/if}
            </span>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
{/snippet}

{#if visible}
  {#if inline}
    <!-- Desktop: plain block at the bottom of the right panel, no overlay -->
    <div in:fly={{ y: 8, duration: 220, opacity: 0 }} out:fly={{ y: 8, duration: 180, opacity: 0 }}>
      {#if loading}
        <PhantomUiShell loading={true} class="border-t border-border bg-surface">
          <div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <div class="h-4 min-w-0 flex-1 rounded-md bg-muted/55"></div>
            <div class="h-8 w-24 shrink-0 rounded-lg bg-muted/50"></div>
            <div class="h-8 w-20 shrink-0 rounded-lg bg-muted/45"></div>
          </div>
        </PhantomUiShell>
      {:else}
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

        <!-- eslint-disable-next-line sonarjs/no-use-of-empty-return-value -->
        {@render timelineBlock()}
      {/if}
    </div>
  {:else}
    <!-- Mobile: collapsible fixed panel above the bottom nav -->
    <div
      class="fixed right-0 bottom-16 left-0 z-50"
      in:fly={{ y: 16, duration: 220, opacity: 0 }}
      out:fly={{ y: 16, duration: 180, opacity: 0 }}
    >
      {#if loading}
        <PhantomUiShell loading={true} class="border-t border-border bg-surface">
          <div class="flex items-center gap-3 px-4 py-3">
            <div class="h-4 min-w-0 flex-1 rounded-md bg-muted/55"></div>
            <div class="h-4 w-16 shrink-0 rounded bg-muted/45"></div>
          </div>
        </PhantomUiShell>
      {:else}
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

            <!-- eslint-disable-next-line sonarjs/no-use-of-empty-return-value -->
            {@render timelineBlock()}
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
              <span
                class="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums"
              >
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
      {/if}
    </div>
  {/if}
{/if}
