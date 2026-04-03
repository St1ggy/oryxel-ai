<script lang="ts">
  import { ImageOff } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof ImageOff> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<ImageOff {...rest} {title} />
