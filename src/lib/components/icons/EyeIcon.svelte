<script lang="ts">
  import { Eye } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Eye> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Eye {...rest} {title} />
