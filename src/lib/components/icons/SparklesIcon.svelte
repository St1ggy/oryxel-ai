<script lang="ts">
  import { Sparkles } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Sparkles> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<Sparkles {...rest} {title} />
