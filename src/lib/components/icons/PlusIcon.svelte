<script lang="ts">
  import { Plus } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Plus> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Plus {...rest} {title} />
