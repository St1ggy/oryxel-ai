<script lang="ts">
  import { cn } from '$lib/utils/cn'

  import type { HTMLInputAttributes } from 'svelte/elements'

  type Props = {
    value?: string
    class?: string
  } & Omit<HTMLInputAttributes, 'class' | 'value'>

  let { value = $bindable(''), class: className, ...rest }: Props = $props()
</script>

<input class={cn('oryx-input', className)} bind:value {...rest} />
