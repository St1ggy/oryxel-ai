<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte'

  import Button from './button.svelte'

  interface Props {
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
    <ChevronLeft class="size-4" />
  </Button>
  <span class="text-sm text-foreground-muted">
    {page} / {pageCount}
  </span>
  <Button variant="secondary" size="sm" disabled={page >= pageCount} onclick={() => go(1)}>
    <ChevronRight class="size-4" />
  </Button>
</div>
