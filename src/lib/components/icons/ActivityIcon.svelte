<script lang="ts">
  import { Activity } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Activity> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Activity {...rest} {title} />
