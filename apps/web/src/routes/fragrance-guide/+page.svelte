<script lang="ts">
  import * as m from '$lib/paraglide/messages.js'

  const concentrations = [
    {
      name: 'Extrait de Parfum',
      abbr: 'EdP+',
      range: '20–40%',
      longevity: '8–12+ h',
      sillage: 'Low',
      strength: 100,
      desc: () => m.oryxel_guide_extrait_desc(),
    },
    {
      name: 'Eau de Parfum',
      abbr: 'EdP',
      range: '15–20%',
      longevity: '6–8 h',
      sillage: 'Medium',
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
      sillage: 'Very light',
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
</script>

<div class="mx-auto max-w-[720px] space-y-6 px-4 py-8 md:px-8">
  <div>
    <h1 class="oryx-heading text-2xl font-medium tracking-tight">{m.oryxel_guide_title()}</h1>
    <p class="mt-1 text-sm text-foreground-muted">{m.oryxel_guide_subtitle()}</p>
  </div>

  <div class="space-y-3">
    {#each concentrations as c (c.abbr)}
      <div class="rounded-xl border border-border bg-surface p-4 md:p-5">
        <div class="mb-3 flex flex-wrap items-baseline gap-2">
          <h2 class="oryx-heading text-base font-semibold">{c.name}</h2>
          <span class="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs text-foreground-muted"
            >{c.abbr}</span
          >
          <span class="text-xs text-foreground-muted">{c.range}</span>
        </div>
        <div class="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div class="h-full rounded-full bg-accent" style="width: {c.strength}%"></div>
        </div>
        <div class="mb-3 flex flex-wrap gap-4 text-xs text-foreground-muted">
          <span>⏱ {c.longevity}</span>
          <span>💨 {c.sillage}</span>
        </div>
        <p class="text-sm text-foreground-muted">{c.desc()}</p>
      </div>
    {/each}
  </div>
</div>
