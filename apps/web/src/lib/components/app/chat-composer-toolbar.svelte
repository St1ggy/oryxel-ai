<script lang="ts">
  import {
    Check,
    ChevronDown,
    Infinity as InfinityIcon,
    LayoutList,
    ListPlus,
    MessageCircle,
    Plus,
    Sparkles,
  } from '@lucide/svelte'
  import { DropdownMenu } from 'bits-ui'

  import * as m from '$lib/paraglide/messages.js'
  import { cn } from '$lib/utils/cn'

  import type { ChatAgentMode } from '@oryxel/ai'

  type ModeOption = {
    value: ChatAgentMode
    label: string
    description: string
    icon: typeof MessageCircle
  }

  type ModelOption = {
    id: string
    label: string
  }

  type ProviderOption = {
    value: string
    label: string
    source?: 'user' | 'platform'
  }

  type Props = {
    chatMode?: ChatAgentMode
    modelId?: string
    selectedProvider?: string
    modelOptions?: ModelOption[]
    providerOptions?: ProviderOption[]
    onChatModeChange?: (mode: ChatAgentMode) => void
    onModelChange?: (modelId: string) => void
    onProviderChange?: (provider: string) => void
  }

  let {
    chatMode = $bindable('agent' as ChatAgentMode),
    modelId = $bindable(''),
    selectedProvider = $bindable(''),
    modelOptions = [],
    providerOptions = [],
    onChatModeChange,
    onModelChange,
    onProviderChange,
  }: Props = $props()

  const modeOptions = $derived<ModeOption[]>([
    {
      value: 'ask',
      label: m.oryxel_chat_mode_ask(),
      description: m.oryxel_chat_mode_ask_desc(),
      icon: MessageCircle,
    },
    {
      value: 'agent',
      label: m.oryxel_chat_mode_agent(),
      description: m.oryxel_chat_mode_agent_desc(),
      icon: InfinityIcon,
    },
    {
      value: 'add',
      label: m.oryxel_chat_mode_add(),
      description: m.oryxel_chat_mode_add_desc(),
      icon: Plus,
    },
    {
      value: 'recommend',
      label: m.oryxel_chat_mode_recommend(),
      description: m.oryxel_chat_mode_recommend_desc(),
      icon: ListPlus,
    },
    {
      value: 'curate',
      label: m.oryxel_chat_mode_curate(),
      description: m.oryxel_chat_mode_curate_desc(),
      icon: LayoutList,
    },
  ])

  const activeMode = $derived(modeOptions.find((option) => option.value === chatMode) ?? modeOptions[1]!)
  const activeModel = $derived(modelOptions.find((option) => option.id === modelId) ?? modelOptions[0])
  const activeProvider = $derived(
    providerOptions.find((option) => option.value === selectedProvider) ?? providerOptions[0],
  )
  const showProviderPicker = $derived(providerOptions.length > 1)

  function selectMode(mode: ChatAgentMode) {
    chatMode = mode
    onChatModeChange?.(mode)
  }

  function selectModel(id: string) {
    modelId = id
    onModelChange?.(id)
  }

  function selectProvider(value: string) {
    selectedProvider = value
    onProviderChange?.(value)
  }

  const pillClass =
    'oryx-transition inline-flex h-7 max-w-[11rem] items-center gap-1.5 rounded-full border border-border bg-[color-mix(in_srgb,var(--oryx-bg-page)_40%,transparent)] px-2.5 text-xs font-medium text-foreground hover:bg-muted/50'
</script>

<div class="flex min-w-0 flex-wrap items-center gap-1.5">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <button type="button" class={pillClass} aria-label={m.oryxel_chat_mode_label()}>
        {#if activeMode}
          {@const ModeIcon = activeMode.icon}
          <ModeIcon class="size-3.5 shrink-0 text-foreground-muted" aria-hidden="true" />
          <span class="truncate">{activeMode.label}</span>
        {/if}
        <ChevronDown class="size-3 shrink-0 text-foreground-muted/80" aria-hidden="true" />
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        class="oryx-dropdown-content z-50 min-w-[15rem] rounded-lg border border-border bg-surface p-1 shadow-[var(--oryx-shadow-md)]"
        sideOffset={6}
        align="start"
      >
        {#each modeOptions as option (option.value)}
          {@const OptionIcon = option.icon}
          <DropdownMenu.Item
            class={cn(
              'oryx-transition flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 outline-none select-none hover:bg-muted data-[highlighted]:bg-muted',
              option.value === chatMode ? 'text-foreground' : 'text-foreground-muted',
            )}
            onSelect={() => {
              selectMode(option.value)
            }}
          >
            <span class="flex items-center gap-2 text-sm font-medium">
              <OptionIcon class="size-3.5 shrink-0" aria-hidden="true" />
              <span class="flex-1">{option.label}</span>
              {#if option.value === chatMode}
                <Check class="size-3.5 text-accent" aria-hidden="true" />
              {/if}
            </span>
            <span class="pl-5 text-[11px] leading-snug text-foreground-muted">{option.description}</span>
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>

  {#if showProviderPicker}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button type="button" class={pillClass} aria-label={m.oryxel_settings_providers()}>
          <Sparkles class="size-3.5 shrink-0 text-foreground-muted" aria-hidden="true" />
          <span class="truncate">{activeProvider?.label ?? m.oryxel_settings_providers()}</span>
          <ChevronDown class="size-3 shrink-0 text-foreground-muted/80" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          class="oryx-dropdown-content z-50 min-w-[14rem] rounded-lg border border-border bg-surface p-1 shadow-[var(--oryx-shadow-md)]"
          sideOffset={6}
          align="start"
        >
          {#each providerOptions as option (option.value)}
            {@const meta =
              option.source === 'platform' ? m.oryxel_provider_source_platform() : m.oryxel_provider_source_own()}
            <DropdownMenu.Item
              class={cn(
                'oryx-transition flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none select-none hover:bg-muted data-[highlighted]:bg-muted',
                option.value === selectedProvider ? 'text-foreground' : 'text-foreground-muted',
              )}
              onSelect={() => {
                selectProvider(option.value)
              }}
            >
              <span class="flex size-4 shrink-0 items-center justify-center text-accent">
                {#if option.value === selectedProvider}
                  <Check class="size-3.5" aria-hidden="true" />
                {/if}
              </span>
              <span class="flex-1 truncate">{option.label}</span>
              <span class="shrink-0 text-[10px] text-foreground-muted/80">{meta}</span>
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  {/if}

  {#if modelOptions.length > 0}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button type="button" class={pillClass} aria-label={m.oryxel_chat_model_select()}>
          <span class="truncate">{activeModel?.label ?? m.oryxel_chat_model_select()}</span>
          <ChevronDown class="size-3 shrink-0 text-foreground-muted/80" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          class="oryx-dropdown-content z-50 min-w-[12rem] rounded-lg border border-border bg-surface p-1 shadow-[var(--oryx-shadow-md)]"
          sideOffset={6}
          align="start"
        >
          {#each modelOptions as option (option.id)}
            <DropdownMenu.Item
              class={cn(
                'oryx-transition flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none select-none hover:bg-muted data-[highlighted]:bg-muted',
                option.id === modelId ? 'text-foreground' : 'text-foreground-muted',
              )}
              onSelect={() => {
                selectModel(option.id)
              }}
            >
              <span class="flex size-4 shrink-0 items-center justify-center text-accent">
                {#if option.id === modelId}
                  <Check class="size-3.5" aria-hidden="true" />
                {/if}
              </span>
              <span class="truncate">{option.label}</span>
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  {/if}

  <span class="hidden text-[10px] text-foreground-muted/70 sm:inline">{m.oryxel_chat_mode_switch_hint()}</span>
</div>
