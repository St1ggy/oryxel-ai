<script lang="ts">
  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import Textarea from '$lib/components/ui/textarea.svelte'
  import * as m from '$lib/paraglide/messages.js'

  type Props = {
    onPosted?: () => void | Promise<void>
  }

  const { onPosted }: Props = $props()

  let draft = $state('')
  let posting = $state(false)

  async function publish() {
    const body = draft.trim()

    if (!body) return

    posting = true

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })

      if (response.ok) {
        draft = ''
        await onPosted?.()
      }
    } finally {
      posting = false
    }
  }
</script>

<Card class="space-y-3 p-4">
  <Textarea bind:value={draft} rows={3} placeholder={m.oryxel_feed_compose_placeholder()} />
  <Button disabled={posting || !draft.trim()} onclick={() => void publish()}>{m.oryxel_feed_post()}</Button>
</Card>
