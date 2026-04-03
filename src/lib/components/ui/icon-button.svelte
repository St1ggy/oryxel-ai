<script lang="ts">
  import { cn } from '$lib/utils/cn'

  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  type Props = {
    label: string
    class?: string
    children?: Snippet
  } & Omit<HTMLButtonAttributes, 'class' | 'children'>

  const { label, class: className, children, type = 'button', ...rest }: Props = $props()
</script>

<button
  {type}
  aria-label={label}
  title={label}
  class={cn(
    'oryx-transition inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-muted active:scale-[0.96] active:bg-subtle disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</button>
