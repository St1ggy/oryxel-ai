<script lang="ts">
  import ChevronLeftIcon from '$lib/components/icons/ChevronLeftIcon.svelte'
  import ChevronRightIcon from '$lib/components/icons/ChevronRightIcon.svelte'

  import Button from './button.svelte'

  type Props = {
    page: number
    pageCount: number
    onPageChange?: (next: number) => void
  }

  const { page, pageCount, onPageChange }: Props = $props()

  function go(delta: number) {
    const next = Math.min(Math.max(1, page + delta), pageCount)

    onPageChange?.(next)
  }
</script>

<div class="flex items-center justify-end gap-2 pt-4">
  <Button variant="secondary" size="sm" disabled={page <= 1} onclick={() => go(-1)}>
    <ChevronLeftIcon class="size-4" />
  </Button>
  <span class="text-sm text-foreground-muted">
    {page} / {pageCount}
  </span>
  <Button variant="secondary" size="sm" disabled={page >= pageCount} onclick={() => go(1)}>
    <ChevronRightIcon class="size-4" />
  </Button>
</div>
