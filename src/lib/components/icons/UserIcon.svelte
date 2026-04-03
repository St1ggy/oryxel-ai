<script lang="ts">
  import { User } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof User> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<User {...rest} {title} />
