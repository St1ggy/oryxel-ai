<script lang="ts">
  import { DropdownMenu } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  export interface SelectOption {
    value: string
    label: string
    meta?: string
    tone?: 'free' | 'paid' | 'neutral'
    disabled?: boolean
  }

  interface Props {
    value?: string
    options: SelectOption[]
    placeholder?: string
    id?: string
    class?: string
    disabled?: boolean
    triggerAriaLabel?: string
  }

  let {
    value = $bindable(''),
    options,
    placeholder = '',
    id,
    class: className,
    disabled = false,
    triggerAriaLabel,
  }: Props = $props()

  const selected = $derived(options.find((option) => option.value === value))

  function badgeClass(tone: SelectOption['tone']): string {
    switch (tone) {
      case 'free': {
        return 'border-success/30 bg-success/10 text-success'
      }

      case 'paid': {
        return 'border-border bg-muted text-foreground-muted'
      }

      case 'neutral': {
        return 'border-border bg-muted text-foreground-muted'
      }

      case undefined: {
        return 'border-border bg-muted text-foreground-muted'
      }
    }
  }

  function badgeDotClass(tone: SelectOption['tone']): string {
    switch (tone) {
      case 'free': {
        return 'bg-success'
      }

      case 'paid': {
        return 'bg-foreground-muted/70'
      }

      case 'neutral': {
        return 'bg-foreground-muted/60'
      }

      case undefined: {
        return 'bg-foreground-muted/60'
      }
    }
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    {id}
    class={cn('oryx-input flex h-9 min-w-[220px] cursor-pointer items-center gap-2 pr-3 text-left', className)}
    {disabled}
    aria-label={triggerAriaLabel}
  >
    <span class="min-w-0 flex-1 truncate text-sm text-foreground">{selected?.label ?? placeholder}</span>
    <span class="flex shrink-0 items-center gap-2">
      {#if selected?.meta}
        <span
          class={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
            badgeClass(selected.tone),
          )}
        >
          <span class={cn('size-1.5 rounded-full', badgeDotClass(selected.tone))}></span>
          {selected.meta}
        </span>
      {/if}
      <span
        class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-sm leading-none text-foreground-muted"
        aria-hidden="true"
      >
        ▼
      </span>
    </span>
  </DropdownMenu.Trigger>

  <DropdownMenu.Portal>
    <DropdownMenu.Content
      sideOffset={6}
      align="start"
      class="oryx-dropdown-content z-50 min-w-[220px] rounded-lg border border-border bg-surface p-1 shadow-card"
    >
      {#each options as option (option.value)}
        <DropdownMenu.Item
          disabled={option.disabled}
          onSelect={() => (value = option.value)}
          class={cn(
            'oryx-transition flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm outline-none select-none hover:bg-muted data-highlighted:bg-muted',
            value === option.value ? 'text-foreground' : 'text-foreground-muted',
          )}
        >
          <span class="truncate">{option.label}</span>
          {#if option.meta}
            <span
              class={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                badgeClass(option.tone),
              )}
            >
              <span class={cn('size-1.5 rounded-full', badgeDotClass(option.tone))}></span>
              {option.meta}
            </span>
          {/if}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
