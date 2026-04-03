<script lang="ts">
  import { Check } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Check> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Check {...rest} {title} />
