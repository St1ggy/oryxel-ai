<script lang="ts">
  import CollectionSealIcon from '$lib/components/icons/CollectionSealIcon.svelte'
  import TooltipHint from '$lib/components/ui/tooltip-hint.svelte'

  type Props = {
    owned: boolean
    label: string
  }

  const { owned, label }: Props = $props()
</script>

{#if owned}
  <TooltipHint content={label}>
    <span class="inline-flex text-[var(--oryx-owned-icon)]" aria-label={label}>
      <CollectionSealIcon class="size-4" />
    </span>
  </TooltipHint>
{/if}
