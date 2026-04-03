<script lang="ts">
  import { CircleHelp } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof CircleHelp> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<CircleHelp {...rest} {title} />
