<script lang="ts">
  import { Checkbox } from 'bits-ui'

  import CheckIcon from '$lib/components/icons/CheckIcon.svelte'

  type Props = {
    checked?: boolean
    disabled?: boolean
    'aria-label'?: string
  }

  let { checked = $bindable(false), disabled = false, 'aria-label': ariaLabel }: Props = $props()
</script>

<Checkbox.Root
  {disabled}
  bind:checked
  aria-label={ariaLabel}
  class="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-surface text-accent data-[state=checked]:border-accent data-[state=checked]:bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)]"
>
  {#snippet children({ checked: isOn })}
    {#if isOn}
      <CheckIcon class="size-3.5 text-foreground" />
    {/if}
  {/snippet}
</Checkbox.Root>
