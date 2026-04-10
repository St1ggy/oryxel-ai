<script lang="ts">
  import { Leaf, Moon, Snowflake, Sun, Sunrise, Sunset } from '@lucide/svelte'

  import * as m from '$lib/paraglide/messages.js'

  import type { DiaryRow } from '$lib/types/diary'

  interface Props {
    row: DiaryRow | null
  }

  const { row }: Props = $props()

  const seasons = $derived(
    row?.season
      ? row.season
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  )

  const times = $derived(
    row?.timeOfDay
      ? row.timeOfDay
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
  )

  const seasonLabelMap: Record<string, () => string> = {
    spring: m.oryxel_meta_spring,
    summer: m.oryxel_meta_summer,
    autumn: m.oryxel_meta_autumn,
    winter: m.oryxel_meta_winter,
  }

  const timeLabelMap: Record<string, () => string> = {
    day: m.oryxel_meta_day,
    evening: m.oryxel_meta_evening,
    night: m.oryxel_meta_night,
  }

  function resolveGenderLabel(gender: string | null): string | null {
    if (gender === 'female') return m.oryxel_meta_female()

    if (gender === 'male') return m.oryxel_meta_male()

    if (gender === 'unisex') return m.oryxel_meta_unisex()

    return null
  }

  function resolveGenderGlyph(gender: string | null): string {
    if (gender === 'female') return '♀'

    if (gender === 'male') return '♂'

    return '⚥'
  }

  const genderLabel = $derived(row ? resolveGenderLabel(row.gender) : null)
  const genderGlyph = $derived(row ? resolveGenderGlyph(row.gender) : '⚥')
  const hasMeta = $derived(seasons.length > 0 || times.length > 0 || genderLabel !== null)
</script>

{#if hasMeta}
  <div class="px-5 pt-4 pb-3">
    <div class="flex flex-wrap gap-1.5">
      {#each seasons as season (season)}
        <span class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground-muted">
          {#if season === 'winter'}
            <Snowflake size={11} strokeWidth={1.75} />
          {:else if season === 'summer'}
            <Sun size={11} strokeWidth={1.75} />
          {:else}
            <Leaf size={11} strokeWidth={1.75} />
          {/if}
          {seasonLabelMap[season]?.() ?? season}
        </span>
      {/each}
      {#each times as time (time)}
        <span class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground-muted">
          {#if time === 'night'}
            <Moon size={11} strokeWidth={1.75} />
          {:else if time === 'evening'}
            <Sunset size={11} strokeWidth={1.75} />
          {:else}
            <Sunrise size={11} strokeWidth={1.75} />
          {/if}
          {timeLabelMap[time]?.() ?? time}
        </span>
      {/each}
      {#if genderLabel}
        <span class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground-muted">
          <span class="text-[10px] leading-none">{genderGlyph}</span>
          {genderLabel}
        </span>
      {/if}
    </div>
  </div>
  <div class="mx-5 h-px bg-border/60"></div>
{/if}
