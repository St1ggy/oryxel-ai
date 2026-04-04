<script lang="ts">
  import { Send } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Send> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Send {...rest} {title} />
