<script lang="ts">
  type Props = { variant?: 'desktop' | 'mobile' }

  const { variant = 'desktop' }: Props = $props()
</script>

<div class="space-y-4">
  <!-- Header card -->
  <div class="rounded-[24px] border border-border bg-surface p-5 shadow-[0_2px_12px_rgb(0_0_0/0.04)]">
    <div class={variant === 'desktop' ? 'flex items-center gap-5' : 'flex flex-col items-center gap-4 text-center'}>
      <div class="size-20 shrink-0 animate-pulse rounded-full bg-muted"></div>
      <div class={variant === 'desktop' ? 'min-w-0 flex-1' : 'space-y-2'}>
        <div class="h-6 w-40 animate-pulse rounded-md bg-muted"></div>
        <div class="mt-1.5 h-4 w-24 animate-pulse rounded-md bg-muted"></div>
      </div>
      <div class="flex shrink-0 gap-2">
        <div class="h-10 w-32 animate-pulse rounded-full bg-muted"></div>
        <div class="h-10 w-10 animate-pulse rounded-full bg-muted"></div>
      </div>
    </div>
  </div>

  <!-- Radar + stats card -->
  <div class="rounded-[24px] border border-border bg-surface p-5 shadow-[0_2px_12px_rgb(0_0_0/0.04)]">
    <div class="mb-5 h-5 w-32 animate-pulse rounded-md bg-muted"></div>
    <!-- Radar placeholder -->
    <div
      class={`mx-auto animate-pulse rounded-full bg-muted ${variant === 'desktop' ? 'size-[288px]' : 'size-[240px]'}`}
    ></div>
    <!-- Stat rows -->
    <div class="mt-5 space-y-3">
      {#each [0, 1, 2] as index (index)}
        <div class="flex items-center gap-3">
          <div class="size-4 animate-pulse rounded bg-muted"></div>
          <div class="h-4 w-24 animate-pulse rounded-md bg-muted"></div>
          <div class="h-4 w-16 animate-pulse rounded-md bg-muted"></div>
        </div>
      {/each}
    </div>
  </div>
</div>
