<script lang="ts">
  import { Leaf, Snowflake, Sun } from '@lucide/svelte'

  import TooltipHint from '$lib/components/ui/tooltip-hint.svelte'
  import * as m from '$lib/paraglide/messages.js'

  interface Props {
    value: string | null
  }

  const { value }: Props = $props()

  const seasons = $derived(
    value
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  )

  const seasonLabels: Record<string, () => string> = {
    spring: m.oryxel_meta_spring,
    summer: m.oryxel_meta_summer,
    autumn: m.oryxel_meta_autumn,
    winter: m.oryxel_meta_winter,
  }

  const tooltip = $derived(seasons.map((s) => seasonLabels[s]?.() ?? s).join(', '))

  function resolveIcon(list: string[]): 'winter' | 'summer' | 'leaf' {
    if (list.includes('winter') && list.length === 1) return 'winter'

    if (list.includes('summer') && !list.includes('winter')) return 'summer'

    return 'leaf'
  }

  const icon = $derived(resolveIcon(seasons))
</script>

{#if seasons.length > 0}
  <TooltipHint content={tooltip}>
    <span class="inline-flex items-center text-foreground-muted/50 hover:text-foreground-muted" aria-label={tooltip}>
      {#if icon === 'winter'}
        <Snowflake size={12} strokeWidth={1.75} />
      {:else if icon === 'summer'}
        <Sun size={12} strokeWidth={1.75} />
      {:else}
        <Leaf size={12} strokeWidth={1.75} />
      {/if}
    </span>
  </TooltipHint>
{/if}
