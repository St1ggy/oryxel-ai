<script lang="ts">
  import * as m from '$lib/paraglide/messages.js'

  // Vary shimmer widths per row so it looks natural
  const widths = ['w-20', 'w-28', 'w-24', 'w-32', 'w-20', 'w-36', 'w-24'] as const
  const fragWidths = ['w-36', 'w-44', 'w-40', 'w-52', 'w-32', 'w-48', 'w-36'] as const
</script>

<div class="overflow-x-auto rounded-[24px] border border-border bg-surface shadow-[0_2px_12px_rgb(0_0_0/0.04)]">
  <table class="w-full min-w-[560px] border-collapse text-left text-sm">
    <thead>
      <tr class="border-b border-border bg-muted/50">
        <th class="px-5 py-3 text-xs font-medium tracking-wide text-foreground-muted uppercase">
          {m.oryxel_table_brand()}
        </th>
        <th class="px-5 py-3 text-xs font-medium tracking-wide text-foreground-muted uppercase">
          {m.oryxel_table_fragrance()}
        </th>
        <th class="px-5 py-3 text-xs font-medium tracking-wide text-foreground-muted uppercase">
          {m.oryxel_table_notes()}
        </th>
        <th class="px-5 py-3 text-xs font-medium tracking-wide text-foreground-muted uppercase">
          {m.oryxel_table_rating()}
        </th>
      </tr>
    </thead>
    <tbody>
      {#each widths as w, index (index)}
        <tr class="border-b border-border last:border-0">
          <td class="px-5 py-4">
            <div class="h-4 {w} animate-pulse rounded-md bg-muted"></div>
          </td>
          <td class="px-5 py-4">
            <div class="flex items-center justify-between gap-3">
              <div class="h-4 {fragWidths[index]} animate-pulse rounded-md bg-muted"></div>
              <div class="flex gap-1">
                <div class="size-4 animate-pulse rounded-full bg-muted"></div>
                <div class="size-4 animate-pulse rounded-full bg-muted"></div>
              </div>
            </div>
          </td>
          <td class="px-5 py-4">
            <div class="flex gap-1.5">
              <div class="h-5 w-14 animate-pulse rounded-full bg-muted"></div>
              <div class="h-5 w-10 animate-pulse rounded-full bg-muted"></div>
              <div class="h-5 w-16 animate-pulse rounded-full bg-muted"></div>
            </div>
          </td>
          <td class="px-5 py-4">
            <div class="flex gap-0.5">
              {#each [0, 1, 2, 3, 4] as star (star)}
                <div class="size-4 animate-pulse rounded-sm bg-muted"></div>
              {/each}
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
