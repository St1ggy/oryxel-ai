<script lang="ts">
  import { Settings } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Settings> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Settings {...rest} {title} />
