<script lang="ts">
  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  export type ProfileTab = 'overview' | 'posts' | 'lists' | 'about'

  type Props = {
    activeTab: ProfileTab
    onTabChange: (tab: ProfileTab) => void
  }

  const { activeTab, onTabChange }: Props = $props()

  const tabs: { id: ProfileTab; label: () => string }[] = [
    { id: 'overview', label: () => m.oryxel_profile_tab_overview() },
    { id: 'posts', label: () => m.oryxel_profile_tab_posts() },
    { id: 'lists', label: () => m.oryxel_profile_tab_lists() },
    { id: 'about', label: () => m.oryxel_profile_tab_about() },
  ]
</script>

<nav
  class="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 pb-px backdrop-blur-sm"
  aria-label={m.oryxel_profile_tab_overview()}
>
  {#each tabs as tab (tab.id)}
    <button
      type="button"
      class={cn(
        'shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
        activeTab === tab.id
          ? 'border-b-2 border-primary text-foreground'
          : 'text-foreground-muted hover:text-foreground',
      )}
      aria-current={activeTab === tab.id ? 'page' : undefined}
      onclick={() => onTabChange(tab.id)}
    >
      {tab.label()}
    </button>
  {/each}
</nav>
