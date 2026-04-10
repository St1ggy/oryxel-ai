<script lang="ts">
  import { EllipsisVertical } from '@lucide/svelte'
  import { DropdownMenu } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  import IconButton from './icon-button.svelte'

  type Item = {
    label: string
    onclick: () => void
    danger?: boolean
  }

  type Props = {
    items: Item[]
  }

  const { items }: Props = $props()
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <IconButton label="Row actions">
      <EllipsisVertical class="size-4" />
    </IconButton>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      class="oryx-dropdown-content z-50 min-w-[10rem] rounded-lg border border-border bg-surface p-1 shadow-[var(--oryx-shadow-md)]"
      sideOffset={4}
    >
      {#each items as item (item.label)}
        <DropdownMenu.Item
          class={cn(
            'oryx-transition flex cursor-pointer items-center rounded-md px-3 py-2 text-sm outline-none select-none hover:bg-muted data-[highlighted]:bg-muted',
            { 'text-destructive': item.danger, 'text-foreground': !item.danger },
          )}
          onSelect={() => item.onclick()}
        >
          {item.label}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
