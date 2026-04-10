<script lang="ts">
  import TooltipHint from '$lib/components/ui/tooltip-hint.svelte'
  import * as m from '$lib/paraglide/messages.js'

  type Props = {
    value: string | null
  }

  const { value }: Props = $props()

  function resolveLabel(v: string | null): string | null {
    if (v === 'female') return m.oryxel_meta_female()

    if (v === 'male') return m.oryxel_meta_male()

    if (v === 'unisex') return m.oryxel_meta_unisex()

    return null
  }

  function resolveGlyph(v: string | null): string | null {
    if (v === 'female') return '♀'

    if (v === 'male') return '♂'

    if (v === 'unisex') return '⚥'

    return null
  }

  const genderLabel = $derived(resolveLabel(value))
  const glyph = $derived(resolveGlyph(value))
</script>

{#if glyph && genderLabel}
  <TooltipHint content={genderLabel}>
    <span
      class="inline-flex items-center text-[11px] leading-none text-foreground-muted/50 hover:text-foreground-muted"
      aria-label={genderLabel}
    >
      {glyph}
    </span>
  </TooltipHint>
{/if}
