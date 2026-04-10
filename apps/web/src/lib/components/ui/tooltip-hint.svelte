<script lang="ts">
  import { Tooltip } from 'bits-ui'

  import type { Snippet } from 'svelte'

  type Props = {
    content: string
    children: Snippet
  }

  const { content, children }: Props = $props()
</script>

<Tooltip.Root>
  <Tooltip.Trigger class="inline-flex">
    {@render children()}
  </Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Content
      class="oryx-tooltip z-[100] max-w-[18rem] rounded-xl border border-border bg-surface-elevated px-3 py-2 text-center text-sm leading-5 text-foreground shadow-[var(--oryx-shadow-md)]"
      sideOffset={8}
    >
      {content}
    </Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>
