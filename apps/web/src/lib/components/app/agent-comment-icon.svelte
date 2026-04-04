<script lang="ts">
  import SparklesIcon from '$lib/components/icons/SparklesIcon.svelte'
  import TooltipHint from '$lib/components/ui/tooltip-hint.svelte'

  type Props = {
    comment: string
  }

  const { comment }: Props = $props()
</script>

{#if comment}
  <TooltipHint content={comment}>
    <span class="inline-flex items-center text-accent/60 hover:text-accent" aria-label={comment}>
      <SparklesIcon class="size-3" />
    </span>
  </TooltipHint>
{/if}
