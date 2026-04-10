<script lang="ts">
  import { X } from '@lucide/svelte'
  import { fly } from 'svelte/transition'

  import Button from '$lib/components/ui/button.svelte'
  import * as m from '$lib/paraglide/messages.js'

  interface Props {
    /** When non-null, the toast is visible. */
    toast: { summary: string; payload: Record<string, unknown> } | null
    onDismiss: () => void
    onViewDetails: (payload: Record<string, unknown>, summary: string) => void
  }

  const { toast, onDismiss, onViewDetails }: Props = $props()
</script>

{#if toast}
  <div
    class="pointer-events-auto fixed right-3 bottom-20 left-3 z-[60] md:right-6 md:bottom-6 md:left-auto md:w-[min(100%,22rem)]"
    role="status"
    transition:fly={{ y: 12, duration: 220 }}
  >
    <div
      class="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
    >
      <div class="flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-foreground">{m.oryxel_patch_applied_notice()}</p>
          <p class="mt-1 line-clamp-3 text-sm text-foreground-muted">{toast.summary}</p>
        </div>
        <button
          type="button"
          class="oryx-transition shrink-0 rounded-lg p-1.5 text-foreground-muted hover:bg-muted hover:text-foreground"
          onclick={onDismiss}
          aria-label={m.oryxel_patch_toast_dismiss()}
        >
          <X class="size-4" />
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          class="h-8 rounded-full px-3 text-xs"
          onclick={() => onViewDetails(toast.payload, toast.summary)}
        >
          {m.oryxel_patch_toast_view_details()}
        </Button>
        <Button size="sm" class="h-8 rounded-full px-3 text-xs" onclick={onDismiss}>
          {m.oryxel_patch_toast_dismiss()}
        </Button>
      </div>
    </div>
  </div>
{/if}
