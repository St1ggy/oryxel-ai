<script lang="ts">
  import { BadgeCheck } from '@lucide/svelte'

  import TooltipHint from '$lib/components/ui/tooltip-hint.svelte'

  interface Props {
    owned: boolean
    label: string
  }

  const { owned, label }: Props = $props()
</script>

{#if owned}
  <TooltipHint content={label}>
    <span class="inline-flex text-[var(--oryx-owned-icon)]" aria-label={label}>
      <BadgeCheck class="size-4" />
    </span>
  </TooltipHint>
{/if}
