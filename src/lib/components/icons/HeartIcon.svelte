<script lang="ts">
  import { Heart } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Heart> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Heart {...rest} {title} />
