<script lang="ts">
  /* eslint-disable import/no-duplicates */
  import { Ellipsis, Leaf, Moon, Snowflake, Sun, Sunrise, Sunset } from '@lucide/svelte'
  import { cubicOut } from 'svelte/easing'
  import { fade, fly } from 'svelte/transition'
  /* eslint-enable import/no-duplicates */

  import SparklesIcon from '$lib/components/icons/SparklesIcon.svelte'
  import RatingStars from '$lib/components/ui/rating-stars.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { DiaryRow } from '$lib/types/diary'

  type Props = {
    open: boolean
    row: DiaryRow | null
    onRatingChange?: (id: number, fragranceId: number, rating: number) => void
    onDelete?: (id: number) => void
    onEdit?: (row: DiaryRow) => void
    onTried?: (brand: string, name: string) => void
  }

  let { open = $bindable(false), row, onRatingChange, onDelete, onEdit, onTried }: Props = $props()

  let commentValue = $state('')
  let commentDirty = $state(false)
  let commentSaving = $state(false)
  let actionsMenuOpen = $state(false)

  $effect(() => {
    if (open && row) {
      commentValue = row.userComment ?? ''
      commentDirty = false
      actionsMenuOpen = false
    }
  })

  function close() {
    open = false
    actionsMenuOpen = false
  }

  async function saveComment() {
    if (!row || !commentDirty || commentSaving) return

    commentSaving = true
    try {
      await fetch(`/api/diary/entries/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userComment: commentValue }),
      })
      commentDirty = false
    } finally {
      commentSaving = false
    }
  }

  function onCommentKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void saveComment()
    } else if (event.key === 'Escape') {
      close()
    }
  }

  const hasPyramid = $derived(row !== null && (row.pyramidTop || row.pyramidMid || row.pyramidBase))

  const pyramidTiers = $derived(
    row
      ? [
          { label: m.oryxel_pyramid_top(), value: row.pyramidTop, symbol: '◦' },
          { label: m.oryxel_pyramid_mid(), value: row.pyramidMid, symbol: '◈' },
          { label: m.oryxel_pyramid_base(), value: row.pyramidBase, symbol: '◉' },
        ].filter((t) => t.value)
      : [],
  )

  const seasons = $derived(
    row?.season
      ? row.season
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  )

  const times = $derived(
    row?.timeOfDay
      ? row.timeOfDay
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
  )

  const seasonLabelMap: Record<string, () => string> = {
    spring: m.oryxel_meta_spring,
    summer: m.oryxel_meta_summer,
    autumn: m.oryxel_meta_autumn,
    winter: m.oryxel_meta_winter,
  }

  const timeLabelMap: Record<string, () => string> = {
    day: m.oryxel_meta_day,
    evening: m.oryxel_meta_evening,
    night: m.oryxel_meta_night,
  }

  function resolveGenderLabel(gender: string | null): string | null {
    if (gender === 'female') return m.oryxel_meta_female()

    if (gender === 'male') return m.oryxel_meta_male()

    if (gender === 'unisex') return m.oryxel_meta_unisex()

    return null
  }

  function resolveGenderGlyph(gender: string | null): string {
    if (gender === 'female') return '♀'

    if (gender === 'male') return '♂'

    return '⚥'
  }

  const genderLabel = $derived(row ? resolveGenderLabel(row.gender) : null)
  const genderGlyph = $derived(row ? resolveGenderGlyph(row.gender) : '⚥')

  const hasMeta = $derived(seasons.length > 0 || times.length > 0 || genderLabel !== null)
  const hasActions = $derived(Boolean(onEdit ?? onDelete ?? onTried))
</script>

{#if open && row}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-40 bg-black/40"
    role="presentation"
    transition:fade={{ duration: 200 }}
    onclick={close}
  ></div>

  <!-- Right-side drawer -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label={row.fragrance}
    tabindex="-1"
    class="fixed top-0 right-0 bottom-0 z-50 flex w-[420px] max-w-full flex-col overflow-hidden border-l border-border bg-surface shadow-[−24px_0_48px_-8px_rgba(0,0,0,0.35)] lg:w-[840px]"
    transition:fly={{ x: 420, duration: 300, easing: cubicOut, opacity: 1 }}
    onkeydown={(event) => event.key === 'Escape' && close()}
  >
    <!-- Header -->
    <div class="relative shrink-0 border-b border-border px-5 pt-5 pb-4">
      <!-- Action controls (top-right) -->
      <div class="absolute top-4 right-4 flex items-center gap-0.5">
        {#if hasActions}
          <div class="relative">
            <button
              type="button"
              class="oryx-transition rounded-lg p-1.5 text-foreground-muted/60 hover:bg-muted hover:text-foreground"
              onclick={() => (actionsMenuOpen = !actionsMenuOpen)}
              aria-label="Actions"
            >
              <Ellipsis size={16} strokeWidth={1.75} />
            </button>

            {#if actionsMenuOpen}
              <div
                class="absolute top-full right-0 z-10 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
                role="menu"
              >
                {#if onTried}
                  <button
                    type="button"
                    role="menuitem"
                    class="oryx-transition w-full px-4 py-2.5 text-left text-sm text-accent hover:bg-muted"
                    onclick={() => {
                      onTried!(row!.brand, row!.fragrance)
                      close()
                    }}
                  >
                    {m.oryxel_rec_tried()}
                  </button>
                {:else}
                  {#if onEdit}
                    <button
                      type="button"
                      role="menuitem"
                      class="oryx-transition w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
                      onclick={() => {
                        onEdit!(row!)
                        close()
                      }}
                    >
                      {m.oryxel_action_edit()}
                    </button>
                  {/if}
                  {#if onDelete}
                    <button
                      type="button"
                      role="menuitem"
                      class="oryx-transition w-full px-4 py-2.5 text-left text-sm text-rose-500 hover:bg-rose-500/8"
                      onclick={() => {
                        onDelete!(row!.id)
                        close()
                      }}
                    >
                      {m.oryxel_action_remove()}
                    </button>
                  {/if}
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        <button
          type="button"
          class="oryx-transition rounded-lg p-1.5 text-foreground-muted/60 hover:bg-muted hover:text-foreground"
          onclick={close}
          aria-label={m.oryxel_detail_close()}
        >
          <svg class="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>

      <p class="mb-1 text-[11px] font-semibold tracking-[0.08em] text-foreground-muted/70 uppercase">
        {row.brand}
      </p>
      <h2 class="oryx-heading pr-16 text-xl leading-tight font-bold tracking-tight text-foreground">
        {row.fragrance}
      </h2>

      <div class="mt-3 flex items-center gap-3">
        <RatingStars
          value={row.rating}
          readonly={false}
          onchange={(v) => onRatingChange?.(row!.id, row!.fragranceId, v)}
        />
        <div class="flex items-center gap-1.5">
          {#if row.isOwned}
            <span class="rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-semibold text-accent">
              {m.oryxel_owned_hint()}
            </span>
          {/if}
          {#if row.isTried && row.isLiked === true}
            <span
              class="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
            >
              {m.oryxel_liked()}
            </span>
          {:else if row.isTried && row.isLiked === false}
            <span
              class="rounded-full bg-rose-500/12 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400"
            >
              {m.oryxel_disliked()}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Scrollable body -->
    <div class="min-h-0 flex-1 overflow-y-auto" role="presentation" onclick={() => (actionsMenuOpen = false)}>
      <!-- Notes -->
      {#if row.notes.length > 0}
        <div class="px-5 pt-5 pb-4">
          <div class="flex flex-wrap gap-1.5">
            {#each row.notes as note (note)}
              <span class="rounded-lg bg-muted px-3 py-1 text-xs font-medium text-foreground-muted">
                {note}
              </span>
            {/each}
          </div>
        </div>
        <div class="mx-5 h-px bg-border/60"></div>
      {/if}

      <!-- Olfactory pyramid -->
      {#if hasPyramid}
        <div class="px-5 pt-4 pb-2">
          <p class="mb-3 text-[10px] font-semibold tracking-widest text-foreground-muted/50 uppercase">
            {m.oryxel_detail_pyramid_title()}
          </p>
          <div class="flex flex-col gap-3">
            {#each pyramidTiers as tier (tier.label)}
              <div class="flex items-start gap-3">
                <span class="mt-0.5 w-4 shrink-0 text-center text-[10px] text-foreground-muted/40">{tier.symbol}</span>
                <div class="min-w-0 flex-1">
                  <span class="mr-2 text-[10px] font-semibold tracking-wider text-foreground-muted/50 uppercase"
                    >{tier.label}</span
                  >
                  <span class="text-sm text-foreground">{tier.value}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
        <div class="mx-5 mt-4 h-px bg-border/60"></div>
      {/if}

      <!-- Season / time of day / gender chips -->
      {#if hasMeta}
        <div class="px-5 pt-4 pb-3">
          <div class="flex flex-wrap gap-1.5">
            {#each seasons as season (season)}
              <span
                class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground-muted"
              >
                {#if season === 'winter'}
                  <Snowflake size={11} strokeWidth={1.75} />
                {:else if season === 'summer'}
                  <Sun size={11} strokeWidth={1.75} />
                {:else}
                  <Leaf size={11} strokeWidth={1.75} />
                {/if}
                {seasonLabelMap[season]?.() ?? season}
              </span>
            {/each}
            {#each times as time (time)}
              <span
                class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground-muted"
              >
                {#if time === 'night'}
                  <Moon size={11} strokeWidth={1.75} />
                {:else if time === 'evening'}
                  <Sunset size={11} strokeWidth={1.75} />
                {:else}
                  <Sunrise size={11} strokeWidth={1.75} />
                {/if}
                {timeLabelMap[time]?.() ?? time}
              </span>
            {/each}
            {#if genderLabel}
              <span
                class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground-muted"
              >
                <span class="text-[10px] leading-none">{genderGlyph}</span>
                {genderLabel}
              </span>
            {/if}
          </div>
        </div>
        <div class="mx-5 h-px bg-border/60"></div>
      {/if}

      <!-- AI insight -->
      {#if row.agentComment}
        <div class="flex items-start gap-2.5 px-5 py-4">
          <SparklesIcon class="mt-0.5 size-3.5 shrink-0 text-accent/60" />
          <p class="text-sm leading-relaxed text-foreground-muted italic">{row.agentComment}</p>
        </div>
        <div class="mx-5 h-px bg-border/60"></div>
      {/if}

      <!-- Your note -->
      <div class="px-5 pt-4 pb-5">
        <p class="mb-2.5 text-[10px] font-semibold tracking-widest text-foreground-muted/50 uppercase">
          {m.oryxel_detail_your_note()}
        </p>
        <textarea
          bind:value={commentValue}
          oninput={() => (commentDirty = true)}
          onblur={() => void saveComment()}
          onkeydown={onCommentKeydown}
          rows="3"
          class="w-full resize-none rounded-lg bg-muted/50 px-3 py-2.5 text-sm leading-relaxed text-foreground transition-colors outline-none placeholder:text-foreground-muted/30 focus:bg-muted/80"
          placeholder={m.oryxel_detail_your_note_placeholder()}
        ></textarea>
        {#if commentDirty}
          <p class="mt-1.5 text-right text-[11px] text-foreground-muted/35">
            {commentSaving ? '…' : '⌘↵'}
          </p>
        {/if}
      </div>
    </div>
  </div>
{/if}
