<script lang="ts">
  import { ChevronRight } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof ChevronRight> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<ChevronRight {...rest} {title} />
