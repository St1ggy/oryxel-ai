<script lang="ts">
  import { cn } from '$lib/utils/cn'

  import type { HTMLTextareaAttributes } from 'svelte/elements'

  type Props = {
    value?: string
    class?: string
  } & Omit<HTMLTextareaAttributes, 'class' | 'value'>

  let { value = $bindable(''), class: className, rows = 3, ...rest }: Props = $props()
</script>

<textarea class={cn('oryx-input min-h-[4.5rem] resize-y', className)} {rows} bind:value {...rest}></textarea>
