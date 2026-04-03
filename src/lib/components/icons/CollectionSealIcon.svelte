<script lang="ts">
  import { BadgeCheck } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof BadgeCheck> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<BadgeCheck {...rest} {title} />
