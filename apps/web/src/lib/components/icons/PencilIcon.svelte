<script lang="ts">
  import { Pencil } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Pencil> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Pencil {...rest} {title} />
