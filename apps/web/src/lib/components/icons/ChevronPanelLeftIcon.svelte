<script lang="ts">
  import { PanelLeftOpen } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof PanelLeftOpen> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<PanelLeftOpen {...rest} {title} />
