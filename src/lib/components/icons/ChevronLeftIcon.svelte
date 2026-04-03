<script lang="ts">
  import { ChevronLeft } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof ChevronLeft> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<ChevronLeft {...rest} {title} />
