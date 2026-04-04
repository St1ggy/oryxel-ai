<script lang="ts">
  import { EllipsisVertical } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof EllipsisVertical> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<EllipsisVertical {...rest} {title} />
