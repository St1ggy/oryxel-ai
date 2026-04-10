<script lang="ts">
  import { Switch } from 'bits-ui'

  type Props = {
    checked?: boolean
    disabled?: boolean
    id?: string
    label: string
    onCheckedChange?: (value: boolean) => void
  }

  let { checked = $bindable(false), disabled = false, id, label, onCheckedChange }: Props = $props()
</script>

<div class="flex items-center gap-3">
  <Switch.Root
    {id}
    {disabled}
    bind:checked
    onCheckedChange={(v) => onCheckedChange?.(v)}
    class="peer oryx-transition inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-border bg-muted px-0.5 data-[state=checked]:border-accent data-[state=checked]:bg-accent"
  >
    <Switch.Thumb
      class="pointer-events-none block size-5 rounded-full bg-surface shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      style="transition-duration: var(--oryx-motion-normal); transition-timing-function: var(--oryx-ease-out);"
    />
  </Switch.Root>
  <label class="text-sm text-foreground" for={id}>{label}</label>
</div>
