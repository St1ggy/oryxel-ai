<script lang="ts">
  import { cn } from '$lib/utils/cn'

  import type { OryxelThemeId } from '$lib/theme/constants'

  type Props = {
    themeId: OryxelThemeId
    title: string
    selected?: boolean
    onclick?: () => void
  }

  const { themeId, title, selected = false, onclick }: Props = $props()

  const previewClass = $derived(
    cn('mb-2 h-14 w-full rounded-lg bg-gradient-to-br shadow-inner', {
      'from-[#E6D3A7] to-[#C4A982]': themeId === 'light-aura',
      'from-[#2D5A4A] to-[#1A3A2F]': themeId === 'midnight-scent',
      'from-[#A8B8A9] to-[#8A9A8B]': themeId === 'botanical',
      'from-[#E8C2D1] to-[#CFA0B3]': themeId === 'rose-blush',
      'from-[#CEC9E8] to-[#ABA2D3]': themeId === 'lavender-mist',
    }),
  )
</script>

<button
  type="button"
  class={cn('oryx-transition-slow w-full rounded-xl border p-3 text-left hover:-translate-y-0.5 active:scale-[0.99]', {
    'border-accent ring-2 ring-ring': selected,
    'border-border hover:border-border-strong': !selected,
  })}
  {onclick}
>
  <div class={previewClass}></div>
  <p class="text-sm font-medium text-foreground">{title}</p>
</button>
