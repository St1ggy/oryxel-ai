<script lang="ts">
  import { cn } from '$lib/utils/cn'

  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = {
    class?: string
    children?: Snippet
    hover?: boolean
  } & HTMLAttributes<HTMLDivElement>

  const { class: className, children, hover = false, ...rest }: Props = $props()
</script>

<div
  class={cn(
    'rounded-[24px] border border-border bg-surface p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]',
    {
      'oryx-transition-slow oryx-card-hover cursor-default hover:-translate-y-0.5 hover:shadow-[var(--oryx-shadow-md)]':
        hover,
    },
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
