<script lang="ts">
  import { EyeOff } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof EyeOff> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<EyeOff {...rest} {title} />
