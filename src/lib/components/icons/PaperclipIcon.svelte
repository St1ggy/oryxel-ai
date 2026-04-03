<script lang="ts">
  import { Paperclip } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Paperclip> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Paperclip {...rest} {title} />
