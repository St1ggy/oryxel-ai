<script lang="ts">
  import Button from '$lib/components/ui/button.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import Modal from '$lib/components/ui/modal.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { DiaryRow } from '$lib/types/diary'

  type StatusValue = 'to_try' | 'liked' | 'neutral' | 'disliked'

  interface SaveData {
    listType: StatusValue
    userComment: string
    isOwned: boolean
  }

  interface Props {
    row?: DiaryRow | null
    open?: boolean
    onSave?: (id: number, data: SaveData) => Promise<void>
  }

  let { row = null, open = $bindable(false), onSave }: Props = $props()

  let statusValue = $state<StatusValue>('to_try')
  let userCommentValue = $state('')
  let isOwnedValue = $state(false)
  let saving = $state(false)
  let saveError = $state(false)

  function inferStatus(r: DiaryRow): StatusValue {
    if (r.isTried && r.isLiked) return 'liked'

    if (r.isTried && r.isDisliked) return 'disliked'

    if (r.isTried) return 'neutral'

    return 'to_try'
  }

  $effect(() => {
    if (row) {
      statusValue = inferStatus(row)
      userCommentValue = row.userComment ?? ''
      isOwnedValue = row.isOwned
      saveError = false
    }
  })

  const statusOptions: { value: StatusValue; label: () => string }[] = [
    { value: 'to_try', label: m.oryxel_tab_try },
    { value: 'liked', label: m.oryxel_tab_liked },
    { value: 'neutral', label: m.oryxel_tab_neutral },
    { value: 'disliked', label: m.oryxel_tab_disliked },
  ]

  function statusButtonClass(value: StatusValue, selected: boolean): string {
    if (!selected) {
      return 'border-border text-foreground-muted hover:border-border-strong hover:text-foreground'
    }

    if (value === 'liked') return 'border-accent bg-accent/10 text-accent'

    if (value === 'disliked') return 'border-destructive bg-destructive/10 text-destructive'

    return 'border-foreground-muted bg-muted/50 text-foreground'
  }

  function close() {
    open = false
    saveError = false
  }

  async function save() {
    if (!row) return

    saving = true
    saveError = false

    try {
      await onSave?.(row.id, {
        listType: statusValue,
        userComment: userCommentValue.trim(),
        isOwned: isOwnedValue,
      })
      close()
    } catch {
      saveError = true
    } finally {
      saving = false
    }
  }
</script>

<Modal bind:open title={m.oryxel_modal_edit_title()}>
  {#if row}
    <div class="space-y-4">
      <p class="text-sm font-medium text-foreground">{row.brand} — {row.fragrance}</p>

      <!-- Status picker -->
      <div>
        <Label class="mb-2 block">{m.oryxel_modal_add_list_type()}</Label>
        <div class="grid grid-cols-2 gap-2">
          {#each statusOptions as opt (opt.value)}
            <button
              type="button"
              class={cn(
                'oryx-transition rounded-xl border px-3 py-2.5 text-left text-sm font-medium',
                statusButtonClass(opt.value, statusValue === opt.value),
              )}
              onclick={() => {
                statusValue = opt.value
              }}
            >
              {opt.label()}
            </button>
          {/each}
        </div>
      </div>

      <!-- Collection toggle -->
      <button
        type="button"
        class={cn(
          'oryx-transition flex w-full items-center gap-3 rounded-xl border px-3 py-2.5',
          isOwnedValue ? 'border-accent/50 bg-accent/5' : 'border-border',
        )}
        onclick={() => {
          isOwnedValue = !isOwnedValue
        }}
        aria-pressed={isOwnedValue}
      >
        <span
          class={cn(
            'flex size-4 shrink-0 items-center justify-center rounded border',
            isOwnedValue ? 'text-accent-foreground border-accent bg-accent' : 'border-border bg-surface',
          )}
        >
          {#if isOwnedValue}
            <svg class="size-2.5" viewBox="0 0 10 8" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 4l3 3 5-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          {/if}
        </span>
        <span class="text-sm text-foreground">{m.oryxel_owned_hint()}</span>
      </button>

      <!-- Comment -->
      <div>
        <Label for="edit-comment" class="mb-1.5 block">{m.oryxel_table_user_comment()}</Label>
        <textarea
          id="edit-comment"
          class="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-border-strong focus:outline-none"
          rows={3}
          placeholder={m.oryxel_table_user_comment_placeholder()}
          bind:value={userCommentValue}
        ></textarea>
      </div>

      {#if saveError}
        <p class="text-sm text-destructive">{m.oryxel_error_save_entry()}</p>
      {/if}
    </div>
  {/if}
  {#snippet footer()}
    <Button variant="secondary" onclick={close} disabled={saving}>{m.oryxel_cancel()}</Button>
    <Button onclick={save} disabled={saving || !row}>
      {saving ? m.oryxel_loading() : m.oryxel_save()}
    </Button>
  {/snippet}
</Modal>
