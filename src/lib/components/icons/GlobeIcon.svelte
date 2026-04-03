<script lang="ts">
  import { Globe } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Globe> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Globe {...rest} {title} />
