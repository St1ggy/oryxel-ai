<script lang="ts">
  import { Lock } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Lock> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Lock {...rest} {title} />
