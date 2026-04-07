<script lang="ts">
  import { onMount } from 'svelte'

  import { cn } from '$lib/utils/cn'

  import type { Snippet } from 'svelte'

  type Props = {
    loading: boolean
    class?: string
    children: Snippet
  }

  let registered = $state(false)

  const { loading, class: className, children }: Props = $props()

  onMount(() => {
    void import('@aejkatappaja/phantom-ui').then(() => {
      registered = true
    })
  })
</script>

{#if registered}
  <phantom-ui
    class={cn('block w-full', className)}
    {loading}
    shimmerColor="color-mix(in srgb, var(--color-foreground-muted) 35%, transparent)"
    backgroundColor="color-mix(in srgb, var(--color-muted) 55%, transparent)"
    duration={1.35}
  >
    {@render children()}
  </phantom-ui>
{:else}
  <div class={cn('block w-full', className)}>
    {@render children()}
  </div>
{/if}
