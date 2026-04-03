<script lang="ts">
  import { PanelRightOpen } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof PanelRightOpen> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<PanelRightOpen {...rest} {title} />
