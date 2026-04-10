<script lang="ts">
  import { BookOpen, Layers, MessageSquare, Package, User } from '@lucide/svelte'

  import { type DiaryPrimaryView, diaryPrimaryNavItems } from '$lib/diary/diary-tab-items'
  import { cn } from '$lib/utils/cn'

  type Props = {
    active: DiaryPrimaryView
    onSelect: (view: DiaryPrimaryView) => void
    variant: 'desktop' | 'mobile'
  }

  const { active, onSelect, variant }: Props = $props()

  const icons: Record<DiaryPrimaryView, typeof Package> = {
    fragrances: Package,
    notes: Layers,
    profile: User,
    guide: BookOpen,
    chat: MessageSquare,
  }

  const items = $derived(diaryPrimaryNavItems(variant))
</script>

{#if variant === 'desktop'}
  <nav
    class="flex min-w-0 flex-1 items-center justify-center gap-1 md:gap-2"
    aria-label="Diary sections"
    data-tour="diary-primary-tabs"
  >
    {#each items as { value, label } (value)}
      {@const Icon = icons[value]}
      <button
        type="button"
        data-tour="primary-{value}"
        onclick={() => onSelect(value)}
        class={cn(
          'oryx-transition flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium md:px-4',
          active === value
            ? 'bg-accent/15 text-accent'
            : 'text-foreground-muted hover:bg-muted/60 hover:text-foreground',
        )}
      >
        <Icon class="size-4 shrink-0" strokeWidth={1.75} />
        <span class="hidden sm:inline">{label()}</span>
      </button>
    {/each}
  </nav>
{:else}
  <nav
    class="fixed right-0 bottom-0 left-0 z-30 flex h-16 items-stretch border-t border-border bg-surface shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden"
    aria-label="Diary sections"
    data-tour="diary-primary-tabs"
  >
    {#each items as { value, label } (value)}
      {@const Icon = icons[value]}
      <button
        type="button"
        data-tour="primary-{value}"
        class={cn(
          'oryx-transition flex flex-1 flex-col items-center justify-center gap-1 px-2 text-[10px] font-medium active:scale-[0.97]',
          active === value ? 'text-accent' : 'text-foreground-muted',
        )}
        onclick={() => onSelect(value)}
      >
        <Icon class="size-5" strokeWidth={1.75} />
        {label()}
      </button>
    {/each}
  </nav>
{/if}
