<script lang="ts">
  import { Moon, Sunrise, Sunset } from '@lucide/svelte'

  import TooltipHint from '$lib/components/ui/tooltip-hint.svelte'
  import * as m from '$lib/paraglide/messages.js'

  interface Props {
    value: string | null
  }

  const { value }: Props = $props()

  const times = $derived(
    value
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  )

  const timeLabels: Record<string, () => string> = {
    day: m.oryxel_meta_day,
    evening: m.oryxel_meta_evening,
    night: m.oryxel_meta_night,
  }

  const tooltip = $derived(times.map((t) => timeLabels[t]?.() ?? t).join(', '))

  function resolveIcon(list: string[]): 'night' | 'evening' | 'day' {
    if (list.includes('night')) return 'night'

    if (list.includes('evening')) return 'evening'

    return 'day'
  }

  const icon = $derived(resolveIcon(times))
</script>

{#if times.length > 0}
  <TooltipHint content={tooltip}>
    <span class="inline-flex items-center text-foreground-muted/50 hover:text-foreground-muted" aria-label={tooltip}>
      {#if icon === 'night'}
        <Moon size={12} strokeWidth={1.75} />
      {:else if icon === 'evening'}
        <Sunset size={12} strokeWidth={1.75} />
      {:else}
        <Sunrise size={12} strokeWidth={1.75} />
      {/if}
    </span>
  </TooltipHint>
{/if}
