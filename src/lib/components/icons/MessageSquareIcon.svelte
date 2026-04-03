<script lang="ts">
  import { MessageSquare } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof MessageSquare> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<MessageSquare {...rest} {title} />
