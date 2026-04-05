<script lang="ts">
  import type { RadarAxis } from '$lib/types/diary'

  type Props = {
    axes: RadarAxis[]
    size?: number
  }

  const { axes, size = 360 }: Props = $props()

  const cx = $derived(size / 2)
  const cy = $derived(size / 2)
  const r = $derived(size * 0.36)
  const n = $derived(axes.length)

  function angleFor(index: number): number {
    return -Math.PI / 2 + (index * 2 * Math.PI) / n
  }

  function pointFor(index: number, value: number) {
    const angle = angleFor(index)
    const rad = (value / 100) * r

    return { x: cx + rad * Math.cos(angle), y: cy + rad * Math.sin(angle) }
  }

  const spokeEndpoints = $derived(axes.map((_, index) => pointFor(index, 100)))
  const vertexPoints = $derived(axes.map(({ value }, index) => pointFor(index, value)))

  // Straight polygon path for ring backgrounds.
  function polygonPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 3) return ''

    const segments = pts.map((p, index) => [index === 0 ? 'M' : 'L', p.x, p.y].join(' '))

    return [...segments, 'Z'].join(' ')
  }

  // Straight-edge polygon with small rounded corners at each vertex.
  function roundedPolygonPath(pts: { x: number; y: number }[], cornerR = 6): string {
    if (pts.length < 3) return ''

    const count = pts.length
    const parts: string[] = []

    for (let index = 0; index < count; index++) {
      const previous = pts[(index - 1 + count) % count]
      const current = pts[index]
      const next = pts[(index + 1) % count]

      const dx1 = current.x - previous.x
      const dy1 = current.y - previous.y
      const length1 = Math.hypot(dx1, dy1)

      const dx2 = next.x - current.x
      const dy2 = next.y - current.y
      const length2 = Math.hypot(dx2, dy2)

      const clampedR = Math.min(cornerR, length1 / 2, length2 / 2)
      const before = { x: current.x - (dx1 / length1) * clampedR, y: current.y - (dy1 / length1) * clampedR }
      const after = { x: current.x + (dx2 / length2) * clampedR, y: current.y + (dy2 / length2) * clampedR }

      if (index === 0) parts.push(`M ${before.x} ${before.y}`)
      else parts.push(`L ${before.x} ${before.y}`)

      parts.push(`Q ${current.x} ${current.y} ${after.x} ${after.y}`)
    }

    parts.push('Z')

    return parts.join(' ')
  }

  const dataPath = $derived(roundedPolygonPath(vertexPoints))

  const ringPaths = $derived(
    [0.33, 0.67, 1].map((ring) => polygonPath(axes.map((_, index) => pointFor(index, ring * 100)))),
  )

  const labelData = $derived(
    axes.map(({ label }, index) => {
      const angle = angleFor(index)
      const tip = pointFor(index, 100)
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const pad = 16

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
        <stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.3" />
        <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.05" />
      </radialGradient>
    </defs>

    <!-- Spider-web rings (curved) -->
    {#each ringPaths as ringPath, index (index)}
      <path d={ringPath} fill="none" stroke="currentColor" stroke-opacity={index === 2 ? 0.1 : 0.06} stroke-width="1" />
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

    <!-- Data polygon (curved) -->
    <path
      d={dataPath}
      fill="url(#radar-fill)"
      stroke="var(--color-accent)"
      stroke-width="1.5"
      class="oryx-transition"
    />

    <!-- Vertex dots -->
    {#each vertexPoints as p, index (index)}
      <circle cx={p.x} cy={p.y} r="3.5" fill="var(--color-accent)" fill-opacity="0.9" class="oryx-transition" />
    {/each}

    <!-- Labels -->
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
