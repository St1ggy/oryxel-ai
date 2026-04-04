<script lang="ts">
  import { List, MessageSquare, User } from '@lucide/svelte'

  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { DiaryMobileTab } from '$lib/types/diary'

  type Props = {
    active: DiaryMobileTab
    onSelect: (tab: DiaryMobileTab) => void
  }

  const { active, onSelect }: Props = $props()
</script>

<nav
  class="fixed right-0 bottom-0 left-0 z-30 flex h-16 items-stretch border-t border-border bg-surface shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden"
  aria-label="Mobile primary"
>
  <button
    type="button"
    class={cn(
      'oryx-transition flex flex-1 flex-col items-center justify-center gap-1 px-2 text-[10px] font-medium active:scale-[0.97]',
      {
        'text-accent': active === 'chat',
        'text-foreground-muted': active !== 'chat',
      },
    )}
    onclick={() => onSelect('chat')}
  >
    <MessageSquare class="size-5" />
    {m.oryxel_mobile_chat()}
  </button>
  <button
    type="button"
    class={cn(
      'oryx-transition flex flex-1 flex-col items-center justify-center gap-1 px-2 text-[10px] font-medium active:scale-[0.97]',
      {
        'text-accent': active === 'lists',
        'text-foreground-muted': active !== 'lists',
      },
    )}
    onclick={() => onSelect('lists')}
  >
    <List class="size-5" />
    {m.oryxel_mobile_tables()}
  </button>
  <button
    type="button"
    class={cn(
      'oryx-transition flex flex-1 flex-col items-center justify-center gap-1 px-2 text-[10px] font-medium active:scale-[0.97]',
      {
        'text-accent': active === 'profile',
        'text-foreground-muted': active !== 'profile',
      },
    )}
    onclick={() => onSelect('profile')}
  >
    <User class="size-5" />
    {m.oryxel_mobile_profile()}
  </button>
</nav>
