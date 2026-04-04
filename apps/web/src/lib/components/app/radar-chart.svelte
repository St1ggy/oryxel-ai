<script lang="ts">
  import type { RadarAxis } from '$lib/types/diary'

  type Props = {
    axes: RadarAxis[]
    size?: number
  }

  const { axes, size = 288 }: Props = $props()

  const cx = $derived(size / 2)
  const cy = $derived(size / 2)
  const r = $derived(size * 0.31)
  const n = $derived(axes.length)

  function angleFor(index: number): number {
    return -Math.PI / 2 + (index * 2 * Math.PI) / n
  }

  function pointFor(index: number, value: number) {
    const angle = angleFor(index)
    const rad = (value / 100) * r

    return {
      x: cx + rad * Math.cos(angle),
      y: cy + rad * Math.sin(angle),
    }
  }

  const polygonPoints = $derived(
    axes
      .map(({ value }, index) => {
        const p = pointFor(index, value)

        return `${p.x},${p.y}`
      })
      .join(' '),
  )

  const spokeEndpoints = $derived(axes.map((_, index) => pointFor(index, 100)))

  const vertexPoints = $derived(axes.map(({ value }, index) => pointFor(index, value)))

  const labelData = $derived(
    axes.map(({ label }, index) => {
      const angle = angleFor(index)
      const tip = pointFor(index, 100)
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const pad = 14

      let dx = 0

      if (cos > 0.15) dx = pad
      else if (cos < -0.15) dx = -pad

      let dy = 4

      if (sin > 0.15) dy = pad
      else if (sin < -0.15) dy = -pad

      let anchor = 'middle'

      if (cos > 0.15) anchor = 'start'
      else if (cos < -0.15) anchor = 'end'

      return { label, x: tip.x + dx, y: tip.y + dy, anchor }
    }),
  )
</script>

{#if n >= 3}
  <svg width={size} height={size} viewBox="0 0 {size} {size}" class="overflow-visible text-accent" aria-hidden="true">
    <defs>
      <radialGradient id="radar-fill" {cx} {cy} {r} gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.32" />
        <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.06" />
      </radialGradient>
    </defs>

    <!-- Concentric rings -->
    {#each [0.33, 0.67, 1] as ring (ring)}
      <circle
        {cx}
        {cy}
        r={r * ring}
        fill="none"
        stroke="currentColor"
        stroke-opacity={ring === 1 ? 0.1 : 0.06}
        stroke-width="1"
      />
    {/each}

    <!-- Spokes -->
    {#each spokeEndpoints as end, index (index)}
      <line
        x1={cx}
        y1={cy}
        x2={end.x}
        y2={end.y}
        stroke="currentColor"
        stroke-opacity="0.1"
        stroke-width="1"
        stroke-dasharray="3 4"
      />
    {/each}

    <!-- Data polygon -->
    <polygon
      points={polygonPoints}
      fill="url(#radar-fill)"
      stroke="var(--color-accent)"
      stroke-width="1.5"
      stroke-linejoin="round"
      class="oryx-transition"
    />

    <!-- Vertex dots -->
    {#each vertexPoints as p, index (index)}
      <circle cx={p.x} cy={p.y} r="3" fill="var(--color-accent)" fill-opacity="0.9" class="oryx-transition" />
    {/each}

    <!-- Labels with paint-order backdrop -->
    {#each labelData as { label, x, y, anchor } (label)}
      <text
        {x}
        {y}
        text-anchor={anchor}
        dominant-baseline="middle"
        stroke="var(--oryx-bg-surface, white)"
        stroke-width="5"
        stroke-linejoin="round"
        paint-order="stroke"
        class="fill-foreground-muted select-none"
        style="font-family: var(--font-body); font-size: 11px; letter-spacing: 0.02em;"
      >
        {label}
      </text>
    {/each}
  </svg>
{:else}
  <div
    class="flex items-center justify-center text-sm text-foreground-muted opacity-40"
    style="width:{size}px;height:{size}px"
  >
    —
  </div>
{/if}
