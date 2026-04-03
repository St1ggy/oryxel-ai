<script lang="ts">
  import { FlaskConical } from '@lucide/svelte'

  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof FlaskConical> & { title?: string }
  const { title, ...rest }: Props = $props()
</script>

<FlaskConical {...rest} {title} />
