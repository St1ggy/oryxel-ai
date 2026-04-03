<script lang="ts">
  import { Palette } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Palette> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Palette {...rest} {title} />
