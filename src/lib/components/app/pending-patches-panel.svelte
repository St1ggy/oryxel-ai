<script lang="ts">
  import { invalidateAll } from '$app/navigation'

  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import * as m from '$lib/paraglide/messages.js'

  type PendingPatch = {
    id: number
    summary: string | null
    status: string
    patchType: string
  }

  type Props = {
    patches: PendingPatch[]
  }

  const { patches }: Props = $props()
  let busyId = $state<number | null>(null)

  async function submitDecision(patchId: number, decision: 'confirm' | 'reject') {
    busyId = patchId
    try {
      await fetch('/api/agent/preferences/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ patchId, decision }),
      })
      await invalidateAll()
    } finally {
      busyId = null
    }
  }
</script>

{#if patches.length > 0}
  <Card class="space-y-3 rounded-2xl border border-border/80 bg-surface px-4 py-3">
    <h3 class="text-sm font-semibold text-foreground">{m.oryxel_pending_title()}</h3>
    <ul class="space-y-2">
      {#each patches as patch (patch.id)}
        <li class="rounded-xl border border-border/70 px-3 py-2">
          <p class="text-sm text-foreground">{patch.summary ?? m.oryxel_pending_fallback_summary()}</p>
          <div class="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              class="h-8 px-3 text-xs"
              disabled={busyId !== null}
              onclick={() => submitDecision(patch.id, 'confirm')}
            >
              {m.oryxel_action_confirm()}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              class="h-8 px-3 text-xs"
              disabled={busyId !== null}
              onclick={() => submitDecision(patch.id, 'reject')}
            >
              {m.oryxel_action_reject()}
            </Button>
          </div>
        </li>
      {/each}
    </ul>
  </Card>
{/if}
