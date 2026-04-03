<script lang="ts">
  import Button from '$lib/components/ui/button.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import Modal from '$lib/components/ui/modal.svelte'
  import Select from '$lib/components/ui/select.svelte'
  import Textarea from '$lib/components/ui/textarea.svelte'
  import * as m from '$lib/paraglide/messages.js'

  import type { FragranceListType } from '$lib/types/diary'

  type SaveData = { brand: string; fragrance: string; notes: string; listType: FragranceListType }

  type Props = {
    open?: boolean
    defaultListType?: FragranceListType
    onSave?: (data: SaveData) => Promise<void>
  }

  let { open = $bindable(false), defaultListType = 'to_try', onSave }: Props = $props()

  let brandValue = $state('')
  let fragranceValue = $state('')
  let notesValue = $state('')
  let listTypeValue = $state<FragranceListType>('to_try')
  let saving = $state(false)
  let saveError = $state(false)

  $effect(() => {
    listTypeValue = defaultListType
  })

  const listOptions = [
    { value: 'to_try', label: m.oryxel_tab_try() },
    { value: 'liked', label: m.oryxel_tab_liked() },
    { value: 'disliked', label: m.oryxel_tab_disliked() },
    { value: 'owned', label: m.oryxel_tab_collection() },
  ]

  function resetForm() {
    brandValue = ''
    fragranceValue = ''
    notesValue = ''
    saveError = false
    // listTypeValue will be reset by the $effect when the modal reopens
  }

  function close() {
    open = false
    resetForm()
  }

  async function save() {
    if (!brandValue.trim() || !fragranceValue.trim()) return

    saving = true
    saveError = false

    try {
      await onSave?.({
        brand: brandValue.trim(),
        fragrance: fragranceValue.trim(),
        notes: notesValue.trim(),
        listType: listTypeValue,
      })
      close()
    } catch {
      saveError = true
    } finally {
      saving = false
    }
  }
</script>

<Modal bind:open title={m.oryxel_modal_add_title()} description={m.oryxel_modal_add_desc()}>
  <div class="space-y-3">
    <div>
      <Label for="add-list-type">{m.oryxel_modal_add_list_type()}</Label>
      <Select
        id="add-list-type"
        class="mt-1 w-full"
        options={listOptions}
        bind:value={listTypeValue}
        triggerAriaLabel={m.oryxel_modal_add_list_type()}
      />
    </div>
    <div>
      <Label for="add-brand">{m.oryxel_brand_field()}</Label>
      <Input id="add-brand" class="mt-1" bind:value={brandValue} placeholder={m.oryxel_brand_field()} />
    </div>
    <div>
      <Label for="add-frag">{m.oryxel_fragrance_field()}</Label>
      <Input id="add-frag" class="mt-1" bind:value={fragranceValue} placeholder={m.oryxel_fragrance_field()} />
    </div>
    <div>
      <Label for="add-notes">{m.oryxel_table_notes()}</Label>
      <Textarea
        id="add-notes"
        class="mt-1"
        rows={2}
        bind:value={notesValue}
        placeholder={m.oryxel_modal_add_notes_placeholder()}
      />
    </div>
    {#if saveError}
      <p class="text-sm text-destructive">{m.oryxel_error_save_entry()}</p>
    {/if}
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={close} disabled={saving}>{m.oryxel_cancel()}</Button>
    <Button onclick={save} disabled={saving || !brandValue.trim() || !fragranceValue.trim()}>
      {saving ? m.oryxel_loading() : m.oryxel_save()}
    </Button>
  {/snippet}
</Modal>
