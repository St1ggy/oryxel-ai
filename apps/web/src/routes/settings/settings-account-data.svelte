<script lang="ts">
  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  let busy = $state(false)
  let errorText = $state('')

  async function exportData(format: 'json' | 'md') {
    busy = true
    errorText = ''
    const exportErrorLabel =
      format === 'json' ? m.oryxel_settings_error_export_json() : m.oryxel_settings_error_export_md()

    try {
      const response = await fetch(`/api/account/export?format=${format}`)

      if (!response.ok) throw new Error(`Failed with ${response.status}`)

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = format === 'json' ? 'oryxel-export.json' : 'oryxel-export.md'
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      errorText = exportErrorLabel
    } finally {
      busy = false
    }
  }

  async function deleteAllData() {
    const confirmDelete = globalThis.confirm(m.oryxel_delete_confirm())

    if (!confirmDelete) return

    busy = true
    errorText = ''

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmText: 'DELETE' }),
      })

      if (!response.ok) throw new Error(`Failed with ${response.status}`)

      globalThis.location.href = '/login'
    } catch {
      errorText = m.oryxel_settings_error_delete_all()
    } finally {
      busy = false
    }
  }
</script>

<Card class="space-y-4 p-6">
  <h3 class="text-sm font-medium">{m.oryxel_settings_data()}</h3>
  <div class="flex flex-wrap gap-2">
    <Button type="button" variant="secondary" disabled={busy} onclick={() => exportData('json')}>
      {m.oryxel_export_json()}
    </Button>
    <Button type="button" variant="secondary" disabled={busy} onclick={() => exportData('md')}>
      {m.oryxel_export_md()}
    </Button>
    <Button type="button" variant="secondary" disabled={busy}>{m.oryxel_import_csv()}</Button>
    <Button type="button" variant="destructive" disabled={busy} onclick={deleteAllData}>
      {m.oryxel_delete_all()}
    </Button>
  </div>
  {#if errorText}
    <p class="text-xs text-destructive">{errorText}</p>
  {/if}
</Card>
