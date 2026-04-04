<script lang="ts">
  import { Star } from '@lucide/svelte'

  type Props = {
    value?: number
    max?: number
    readonly?: boolean
    onchange?: (value: number) => void
  }

  let { value = $bindable(0), max = 5, readonly = false, onchange }: Props = $props()

  function setRating(next: number) {
    if (readonly) {
      return
    }

    value = next
    onchange?.(next)
  }
</script>

<div class="flex items-center gap-0.5" role={readonly ? 'img' : 'group'} aria-label="Rating {value} of {max}">
  {#each Array.from({ length: max }, (_, index) => index + 1) as n (n)}
    <button
      type="button"
      class="oryx-transition rounded p-0.5 active:scale-90 disabled:cursor-default disabled:active:scale-100"
      disabled={readonly}
      onclick={() => setRating(n)}
    >
      <Star
        class="size-4"
        fill={n <= value ? 'var(--oryx-star-filled)' : 'transparent'}
        style="color: {n <= value ? 'var(--oryx-star-filled)' : 'var(--oryx-star-empty)'}"
      />
    </button>
  {/each}
</div>
