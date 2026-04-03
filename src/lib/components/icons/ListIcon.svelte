<script lang="ts">
  import { List } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof List> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<List {...rest} {title} />
