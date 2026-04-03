<script lang="ts">
  import { cn } from '$lib/utils/cn'

  import type { Snippet } from 'svelte'

  type Props = {
    role: 'user' | 'assistant'
    class?: string
    children?: Snippet
  }

  const { role, class: className, children }: Props = $props()
</script>

<div
  class={cn(
    'max-w-[85%] text-[15px] leading-[1.625] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]',
    {
      'ml-auto rounded-tl-[20px] rounded-tr-[8px] rounded-br-[20px] rounded-bl-[20px] px-5 py-3 text-[var(--oryx-fg-on-accent)]':
        role === 'user',
      'mr-auto rounded-tl-[8px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[20px] px-5 py-3 text-foreground':
        role === 'assistant',
    },
    className,
  )}
  style={role === 'user' ? 'background: var(--oryx-bg-chat-user);' : 'background-color: var(--oryx-bg-chat-ai);'}
>
  {@render children?.()}
</div>
