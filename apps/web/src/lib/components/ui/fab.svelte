<script lang="ts">
  import { cn } from '$lib/utils/cn'

  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  type Props = {
    label: string
    /** Caption next to the icon on `md+` screens (only for `position="br"`). */
    caption?: string
    position?: 'br' | 'bc'
    class?: string
    children?: Snippet
  } & Omit<HTMLButtonAttributes, 'class' | 'children'>

  const { label, caption, position = 'br', class: className, children, type = 'button', ...rest }: Props = $props()

  const extended = $derived(Boolean(caption && position === 'br'))
</script>

<button
  {type}
  aria-label={label}
  title={label}
  class={cn(
    'oryx-btn-primary oryx-transition-slow fixed z-40 flex items-center justify-center rounded-full shadow-card-hover hover:opacity-90 active:scale-[0.96] disabled:opacity-45 disabled:hover:opacity-45 disabled:active:scale-100',
    extended ? 'h-14 w-14 gap-0 md:h-auto md:min-h-14 md:w-auto md:gap-2 md:px-6 md:py-3' : 'h-14 w-14',
    {
      'right-6 bottom-6 md:right-8 md:bottom-8': position === 'br',
      'bottom-6 left-1/2 -translate-x-1/2 md:bottom-8': position === 'bc',
    },
    className,
  )}
  {...rest}
>
  {@render children?.()}
  {#if extended}
    <span class="hidden max-w-48 truncate text-sm font-medium md:inline">{caption}</span>
  {/if}
</button>
