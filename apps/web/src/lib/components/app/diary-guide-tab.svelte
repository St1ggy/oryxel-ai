<script lang="ts">
  import { Clock, Droplets, Flame, Layers, Leaf, MapPin, Minimize2, Sprout, Sun, Waves } from '@lucide/svelte'

  import * as m from '$lib/paraglide/messages.js'

  interface Props {
    layout: 'desktop' | 'mobile'
  }

  const { layout }: Props = $props()

  const concentrations = [
    {
      name: 'Extrait de Parfum',
      abbr: 'EdP+',
      range: '20–40%',
      longevity: '8–12+ h',
      sillage: 'Intimate',
      strength: 100,
      desc: () => m.oryxel_guide_extrait_desc(),
    },
    {
      name: 'Eau de Parfum',
      abbr: 'EdP',
      range: '15–20%',
      longevity: '6–8 h',
      sillage: 'Noticeable',
      strength: 75,
      desc: () => m.oryxel_guide_edp_desc(),
    },
    {
      name: 'Eau de Toilette',
      abbr: 'EdT',
      range: '10–15%',
      longevity: '4–6 h',
      sillage: 'Light',
      strength: 55,
      desc: () => m.oryxel_guide_edt_desc(),
    },
    {
      name: 'Eau de Cologne',
      abbr: 'EdC',
      range: '2–4%',
      longevity: '2–3 h',
      sillage: 'Subtle',
      strength: 25,
      desc: () => m.oryxel_guide_edc_desc(),
    },
    {
      name: 'Eau Fraîche',
      abbr: 'EF',
      range: '1–3%',
      longevity: '1–2 h',
      sillage: 'Minimal',
      strength: 12,
      desc: () => m.oryxel_guide_fraiche_desc(),
    },
  ] as const

  const tips = [
    { icon: MapPin, title: () => m.oryxel_guide_tip_pulse_title(), desc: () => m.oryxel_guide_tip_pulse_desc() },
    { icon: Minimize2, title: () => m.oryxel_guide_tip_less_title(), desc: () => m.oryxel_guide_tip_less_desc() },
    { icon: Clock, title: () => m.oryxel_guide_tip_drydown_title(), desc: () => m.oryxel_guide_tip_drydown_desc() },
    { icon: Layers, title: () => m.oryxel_guide_tip_layer_title(), desc: () => m.oryxel_guide_tip_layer_desc() },
  ] as const

  const families = [
    {
      icon: Sun,
      bg: 'bg-yellow-400/10',
      iconColor: 'text-yellow-500',
      name: () => m.oryxel_guide_family_citrus_name(),
      desc: () => m.oryxel_guide_family_citrus_desc(),
    },
    {
      icon: Sprout,
      bg: 'bg-pink-400/10',
      iconColor: 'text-pink-500',
      name: () => m.oryxel_guide_family_floral_name(),
      desc: () => m.oryxel_guide_family_floral_desc(),
    },
    {
      icon: Leaf,
      bg: 'bg-amber-400/10',
      iconColor: 'text-amber-600',
      name: () => m.oryxel_guide_family_woody_name(),
      desc: () => m.oryxel_guide_family_woody_desc(),
    },
    {
      icon: Flame,
      bg: 'bg-orange-400/10',
      iconColor: 'text-orange-500',
      name: () => m.oryxel_guide_family_oriental_name(),
      desc: () => m.oryxel_guide_family_oriental_desc(),
    },
    {
      icon: Waves,
      bg: 'bg-sky-400/10',
      iconColor: 'text-sky-500',
      name: () => m.oryxel_guide_family_fresh_name(),
      desc: () => m.oryxel_guide_family_fresh_desc(),
    },
    {
      icon: Droplets,
      bg: 'bg-violet-400/10',
      iconColor: 'text-violet-500',
      name: () => m.oryxel_guide_family_gourmand_name(),
      desc: () => m.oryxel_guide_family_gourmand_desc(),
    },
  ] as const
</script>

<div class={layout === 'desktop' ? 'max-w-[720px] space-y-8' : 'space-y-6'}>
  <!-- Concentrations -->
  <section>
    <div class="{layout === 'desktop' ? 'mb-4' : 'mb-3'} space-y-1">
      <h2 class="oryx-heading text-base font-semibold">{m.oryxel_guide_subtitle()}</h2>
    </div>
    <div class="space-y-3">
      {#each concentrations as c (c.abbr)}
        <div class="rounded-xl border border-border bg-surface {layout === 'desktop' ? 'p-4 md:p-5' : 'p-4'}">
          <div class="flex items-start gap-4">
            <div class="mt-0.5 flex shrink-0 flex-col items-center gap-1">
              {#each [100, 75, 55, 25, 12] as level (level)}
                <div
                  class="size-2 rounded-full transition-colors"
                  style="background-color: {c.strength >= level ? 'var(--color-accent)' : 'var(--oryx-bg-muted)'}"
                ></div>
              {/each}
            </div>
            <div class="min-w-0 flex-1">
              <div class="mb-1.5 flex flex-wrap items-baseline gap-2">
                <h3 class="oryx-heading text-sm font-semibold">{c.name}</h3>
                <span
                  class="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground-muted"
                  >{c.abbr}</span
                >
                <span class="text-xs text-foreground-muted">{c.range}</span>
              </div>
              <div class="mb-3 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div class="h-full rounded-full bg-accent transition-[width]" style="width: {c.strength}%"></div>
              </div>
              <div class="mb-2.5 flex flex-wrap gap-4 text-xs text-foreground-muted">
                <span class="flex items-center gap-1">
                  <Clock class="size-3.5 shrink-0 opacity-60" />
                  {c.longevity}
                </span>
                <span class="flex items-center gap-1">
                  <Waves class="size-3.5 shrink-0 opacity-60" />
                  {c.sillage}
                </span>
              </div>
              <p class="text-sm leading-relaxed text-foreground-muted">{c.desc()}</p>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Application Tips -->
  <section>
    <h2 class="oryx-heading {layout === 'desktop' ? 'mb-4' : 'mb-3'} text-base font-semibold">
      {m.oryxel_guide_tips_title()}
    </h2>
    <div class="grid gap-3 {layout === 'desktop' ? 'sm:grid-cols-2' : 'grid-cols-1'}">
      {#each tips as tip (tip.title())}
        <div class="flex gap-3 rounded-xl border border-border bg-surface p-4">
          <div class="mt-0.5 shrink-0 rounded-lg bg-accent/10 p-2">
            <tip.icon class="size-4 text-accent" />
          </div>
          <div>
            <p class="mb-1 text-sm font-medium text-foreground">{tip.title()}</p>
            <p class="text-xs leading-relaxed text-foreground-muted">{tip.desc()}</p>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Fragrance Families -->
  <section>
    <h2 class="oryx-heading {layout === 'desktop' ? 'mb-4' : 'mb-3'} text-base font-semibold">
      {m.oryxel_guide_families_title()}
    </h2>
    <div class="grid gap-3 {layout === 'desktop' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
      {#each families as fam (fam.name())}
        <div class="flex gap-3 rounded-xl border border-border bg-surface p-4">
          <div class="mt-0.5 shrink-0 rounded-lg p-2 {fam.bg}">
            <fam.icon class="size-4 {fam.iconColor}" />
          </div>
          <div>
            <p class="mb-1 text-sm font-medium text-foreground">{fam.name()}</p>
            <p class="text-xs leading-relaxed text-foreground-muted">{fam.desc()}</p>
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>
