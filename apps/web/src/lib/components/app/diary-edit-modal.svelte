<script lang="ts">
  import Button from '$lib/components/ui/button.svelte'
  import CheckboxField from '$lib/components/ui/checkbox-field.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import Modal from '$lib/components/ui/modal.svelte'
  import Select from '$lib/components/ui/select.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { DiaryRow, FragranceListType } from '$lib/types/diary'

  type SaveData = { listType: FragranceListType; userComment: string; isOwned: boolean }

  type Props = {
    row?: DiaryRow | null
    open?: boolean
    onSave?: (id: number, data: SaveData) => Promise<void>
  }

  let { row = null, open = $bindable(false), onSave }: Props = $props()

  let listTypeValue = $state<FragranceListType>('to_try')
  let userCommentValue = $state('')
  let isOwnedValue = $state(false)
  let saving = $state(false)
  let saveError = $state(false)

  function inferListType(r: DiaryRow): FragranceListType {
    if (r.isTried && r.isLiked === true) return 'liked'

    if (r.isTried && r.isLiked === false) return 'disliked'

    if (r.isOwned) return 'owned'

    return 'to_try'
  }

  $effect(() => {
    if (row) {
      listTypeValue = inferListType(row)
      userCommentValue = row.userComment ?? ''
      isOwnedValue = row.isOwned
      saveError = false
    }
  })

  const listOptions = [
    { value: 'to_try', label: m.oryxel_tab_try() },
    { value: 'liked', label: m.oryxel_tab_liked() },
    { value: 'disliked', label: m.oryxel_tab_disliked() },
    { value: 'owned', label: m.oryxel_tab_collection() },
  ]

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
        listType: listTypeValue,
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
    <div class="space-y-3">
      <p class="text-sm font-medium text-foreground">
        {row.brand} — {row.fragrance}
      </p>
      <div>
        <Label for="edit-list-type">{m.oryxel_modal_add_list_type()}</Label>
        <Select
          id="edit-list-type"
          class="mt-1 w-full"
          options={listOptions}
          bind:value={listTypeValue}
          triggerAriaLabel={m.oryxel_modal_add_list_type()}
        />
      </div>
      <div>
        <Label for="edit-status">{m.oryxel_table_user_comment()}</Label>
        <Input
          id="edit-status"
          class="mt-1"
          bind:value={userCommentValue}
          placeholder={m.oryxel_table_user_comment_placeholder()}
        />
      </div>
      <div class="flex items-center gap-2">
        <CheckboxField bind:checked={isOwnedValue} aria-label={m.oryxel_owned_hint()} />
        <span class="text-sm text-foreground">{m.oryxel_owned_hint()}</span>
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
