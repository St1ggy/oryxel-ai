<script lang="ts">
  import { cn } from '$lib/utils/cn'

  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  type Props = {
    selected?: boolean
    class?: string
    children?: Snippet
  } & Omit<HTMLButtonAttributes, 'class' | 'children'>

  const { selected = false, class: className, children, type = 'button', ...rest }: Props = $props()
</script>

<button
  {type}
  class={cn(
    'oryx-transition h-[30px] shrink-0 rounded-full border px-3 text-xs font-medium whitespace-nowrap shadow-sm active:scale-[0.97]',
    {
      'border-accent bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)] text-foreground': selected,
      'border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground': !selected,
    },
    className,
  )}
  {...rest}
>
  {@render children?.()}
</button>
