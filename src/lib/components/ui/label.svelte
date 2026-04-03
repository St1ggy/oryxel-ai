<script lang="ts">
  import { cn } from '$lib/utils/cn'

  import type { Snippet } from 'svelte'
  import type { HTMLLabelAttributes } from 'svelte/elements'

  type Props = {
    class?: string
    children?: Snippet
  } & Omit<HTMLLabelAttributes, 'class' | 'children'>

  const { class: className, children, ...rest }: Props = $props()
</script>

<label class={cn('text-sm font-medium text-foreground', className)} {...rest}>{@render children?.()}</label>
