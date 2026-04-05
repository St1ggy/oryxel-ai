<script lang="ts">
  /* eslint-disable import/no-duplicates */
  import { Sparkles } from '@lucide/svelte'
  import { cubicOut } from 'svelte/easing'
  import { fade, fly } from 'svelte/transition'
  /* eslint-enable import/no-duplicates */

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

  $effect(() => {
    if (open && row) {
      commentValue = row.userComment ?? ''
      commentDirty = false
    }
  })

  function close() {
    open = false
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
</script>

{#if open && row}
  <div
    class="fixed inset-0 z-40 bg-black/40"
    role="presentation"
    transition:fade={{ duration: 180 }}
    onclick={close}
  ></div>

  <div
    role="dialog"
    aria-modal="true"
    aria-label={row.fragrance}
    tabindex="-1"
    class="fixed top-0 right-0 z-50 flex h-full w-full flex-col bg-surface sm:w-[420px] sm:border-l sm:border-border"
    transition:fly={{ x: 440, duration: 280, easing: cubicOut, opacity: 1 }}
    onkeydown={(event) => event.key === 'Escape' && close()}
  >
    <!-- Header -->
    <div class="relative shrink-0 px-6 pt-6 pb-5">
      <button
        type="button"
        class="oryx-transition absolute top-4 right-4 rounded-lg p-1.5 text-foreground-muted/60 hover:bg-muted hover:text-foreground"
        onclick={close}
        aria-label={m.oryxel_detail_close()}
      >
        <svg class="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>

      <p class="mb-1 text-[11px] font-semibold tracking-[0.08em] text-foreground-muted/70 uppercase">
        {row.brand}
      </p>
      <h2 class="oryx-heading pr-8 text-2xl leading-tight font-bold tracking-tight text-foreground">
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
          {#if row.isTried && row.isLiked}
            <span
              class="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
            >
              {m.oryxel_liked()}
            </span>
          {:else if row.isTried && row.isDisliked}
            <span
              class="rounded-full bg-rose-500/12 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400"
            >
              {m.oryxel_disliked()}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <div class="mx-6 h-px bg-border"></div>

    <!-- Body -->
    <div class="min-h-0 flex-1 overflow-y-auto">
      <!-- Notes -->
      {#if row.notes.length > 0}
        <div class="px-6 pt-5 pb-4">
          <div class="flex flex-wrap gap-1.5">
            {#each row.notes as note (note)}
              <span class="rounded-lg bg-muted px-3 py-1 text-xs font-medium text-foreground-muted">
                {note}
              </span>
            {/each}
          </div>
        </div>
        <div class="mx-6 h-px bg-border/60"></div>
      {/if}

      <!-- Olfactory pyramid -->
      {#if hasPyramid}
        <div class="px-6 pt-4 pb-2">
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
        <div class="mx-6 mt-4 h-px bg-border/60"></div>
      {/if}

      <!-- AI insight -->
      {#if row.agentComment}
        <div class="flex items-start gap-3 px-6 py-4">
          <Sparkles class="mt-0.5 size-3.5 shrink-0 text-accent/60" />
          <p class="text-sm leading-relaxed text-foreground-muted italic">{row.agentComment}</p>
        </div>
        <div class="mx-6 h-px bg-border/60"></div>
      {/if}

      <!-- Your note -->
      <div class="px-6 py-4">
        <textarea
          bind:value={commentValue}
          oninput={() => (commentDirty = true)}
          onblur={() => void saveComment()}
          onkeydown={onCommentKeydown}
          rows="3"
          class="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-foreground-muted/35"
          placeholder={m.oryxel_detail_your_note_placeholder()}
        ></textarea>
        {#if commentDirty}
          <p class="text-right text-[11px] text-foreground-muted/40">{commentSaving ? '…' : '⌘↵ to save'}</p>
        {/if}
      </div>
    </div>

    <!-- Footer -->
    <div class="shrink-0 border-t border-border px-4 py-3">
      {#if onTried}
        <button
          type="button"
          class="oryx-transition w-full rounded-xl bg-accent/10 py-2.5 text-sm font-semibold text-accent hover:bg-accent/18"
          onclick={() => {
            onTried!(row!.brand, row!.fragrance)
            close()
          }}
        >
          {m.oryxel_rec_tried()}
        </button>
      {:else}
        <div class="flex gap-2">
          <button
            type="button"
            class="oryx-transition flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            onclick={() => {
              onEdit?.(row!)
              close()
            }}
          >
            {m.oryxel_action_edit()}
          </button>
          <button
            type="button"
            class="oryx-transition rounded-xl border border-rose-500/30 px-5 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-500/8"
            onclick={() => {
              onDelete?.(row!.id)
              close()
            }}
          >
            {m.oryxel_action_remove()}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
