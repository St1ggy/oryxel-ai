<script lang="ts">
  import { User } from '@lucide/svelte'

  import { cn } from '$lib/utils/cn'

  type Props = {
    src?: string | null
    alt: string
    size?: 'sm' | 'md' | 'lg'
    class?: string
  }

  const { src, alt, size = 'md', class: className }: Props = $props()
</script>

<div
  class={cn(
    'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-foreground',
    {
      'size-8 text-xs': size === 'sm',
      'size-10 text-sm': size === 'md',
      'size-20 text-2xl': size === 'lg',
    },
    className,
  )}
  style="background: linear-gradient(135deg, var(--oryx-accent-a), var(--oryx-accent-b)); box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);"
>
  {#if src}
    <img {src} {alt} class="size-full object-cover" />
  {:else}
    <User
      class={cn('text-[var(--oryx-fg-on-accent)]', {
        'size-4': size === 'sm',
        'size-5': size === 'md',
        'size-10': size === 'lg',
      })}
    />
  {/if}
</div>
