<script lang="ts">
  interface Props {
    notes: string[]
  }

  const { notes }: Props = $props()
</script>

<div class="flex flex-wrap gap-1">
  {#each notes as note (note)}
    <span class="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-foreground-muted">
      {note}
    </span>
  {/each}
</div>
