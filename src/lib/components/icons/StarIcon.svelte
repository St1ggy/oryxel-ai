<script lang="ts">
  import { Star } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Star> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Star {...rest} {title} />
