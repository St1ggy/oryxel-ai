<script lang="ts">
  import { Sparkles } from '@lucide/svelte'
  /* eslint-disable import-x/no-duplicates -- easing vs transition are separate runtime modules */
  import { cubicOut } from 'svelte/easing'
  import { fade, fly } from 'svelte/transition'
  /* eslint-enable import-x/no-duplicates */

  import FragranceActionsMenu from '$lib/components/app/fragrance-actions-menu.svelte'
  import FragranceMetaChips from '$lib/components/app/fragrance-meta-chips.svelte'
  import FragrancePyramid from '$lib/components/app/fragrance-pyramid.svelte'
  import RatingStars from '$lib/components/ui/rating-stars.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { DiaryRow } from '$lib/types/diary'

  interface Props {
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
      <div class="absolute top-4 right-4 flex items-center gap-0.5">
        {#if hasActions}
          <FragranceActionsMenu {row} {onEdit} {onDelete} {onTried} onClose={close} />
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

    <!-- Scrollable body -->
    <div class="min-h-0 flex-1 overflow-y-auto" role="presentation">
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

      <FragrancePyramid {row} />

      <FragranceMetaChips {row} />

      {#if row.agentComment}
        <div class="flex items-start gap-2.5 px-5 py-4">
          <Sparkles class="mt-0.5 size-3.5 shrink-0 text-accent/60" />
          <p class="text-sm leading-relaxed text-foreground-muted italic">{row.agentComment}</p>
        </div>
        <div class="mx-5 h-px bg-border/60"></div>
      {/if}

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
