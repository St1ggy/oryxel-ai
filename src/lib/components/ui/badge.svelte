<script lang="ts">
  import { cn } from '$lib/utils/cn'

  import type { Snippet } from 'svelte'

  type Tone = 'neutral' | 'success' | 'warning' | 'destructive' | 'accent'

  type Props = {
    tone?: Tone
    class?: string
    children?: Snippet
  }

  const { tone = 'neutral', class: className, children }: Props = $props()
</script>

<span
  class={cn(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    {
      'bg-[var(--oryx-badge-neutral-bg)] text-[var(--oryx-badge-neutral-fg)]': tone === 'neutral',
      'bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-success': tone === 'success',
      'bg-[color-mix(in_srgb,var(--color-warning)_22%,transparent)] text-warning': tone === 'warning',
      'bg-[color-mix(in_srgb,var(--color-destructive)_18%,transparent)] text-destructive': tone === 'destructive',
      'bg-[color-mix(in_srgb,var(--color-accent)_22%,transparent)] text-accent': tone === 'accent',
    },
    className,
  )}
>
  {@render children?.()}
</span>
