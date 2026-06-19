<script lang="ts">
  import { cn } from '$lib/utils/cn'
  import { profileInitials } from '$lib/utils/profile-initials'

  type Props = {
    displayName?: string | null
    username?: string | null
    src?: string | null
    size?: 'sm' | 'md' | 'lg'
    class?: string
  }

  const { displayName, username = '', src, size = 'md', class: className }: Props = $props()

  const initials = $derived(profileInitials(displayName, username ?? ''))
  const alt = $derived(displayName?.trim() || username || 'User')
</script>

<div
  class={cn(
    'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-[var(--oryx-fg-on-accent)]',
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
    <img {src} alt={alt} class="size-full object-cover" />
  {:else}
    {initials}
  {/if}
</div>
