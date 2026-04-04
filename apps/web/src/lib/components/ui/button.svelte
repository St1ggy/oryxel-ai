<script lang="ts">
  import { cn } from '$lib/utils/cn'

  import type { Snippet } from 'svelte'
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements'

  type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'

  type Props = {
    variant?: Variant
    size?: 'sm' | 'md' | 'lg'
    class?: string
    children?: Snippet
    href?: string
  } & Omit<HTMLButtonAttributes, 'class' | 'children' | 'type'> &
    Omit<HTMLAnchorAttributes, 'class' | 'children' | 'href'>

  const {
    variant = 'primary',
    size = 'md',
    class: className,
    children,
    href,
    type: buttonType = 'button',
    ...rest
  }: Props = $props()

  const classNames = $derived(
    cn(
      'oryx-transition inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium no-underline active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
      {
        'h-8 px-3 text-xs': size === 'sm',
        'h-9 px-4 text-sm': size === 'md',
        'h-11 px-5 text-base': size === 'lg',
      },
      {
        'oryx-btn-primary': variant === 'primary',
        'oryx-btn-secondary': variant === 'secondary' || variant === 'outline',
        'bg-transparent text-foreground hover:bg-[var(--oryx-bg-muted)] active:bg-[var(--oryx-bg-subtle)]':
          variant === 'ghost',
        'border border-destructive text-destructive hover:bg-[color-mix(in_srgb,var(--color-destructive)_12%,transparent)]':
          variant === 'destructive',
      },
      className,
    ),
  )
</script>

{#if href}
  <a {href} class={classNames} {...rest as HTMLAnchorAttributes}>
    {@render children?.()}
  </a>
{:else}
  <button type={buttonType as 'button' | 'submit' | 'reset'} class={classNames} {...rest as HTMLButtonAttributes}>
    {@render children?.()}
  </button>
{/if}
