<script lang="ts">
  import { ArrowLeft } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof ArrowLeft> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<ArrowLeft {...rest} {title} />
