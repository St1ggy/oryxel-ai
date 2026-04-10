<script lang="ts">
  import { Eye, EyeOff, Lock } from '@lucide/svelte'

  import * as m from '$lib/paraglide/messages.js'

  import IconButton from './icon-button.svelte'
  import Input from './input.svelte'

  interface Props {
    value?: string
    placeholder?: string
    id?: string
    disabled?: boolean
  }

  let { value = $bindable(''), placeholder, id, disabled = false }: Props = $props()

  let visible = $state(false)
</script>

<div class="relative">
  <span
    class="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-foreground-muted"
    aria-hidden="true"
  >
    <Lock class="size-4" />
  </span>
  <Input
    {id}
    class="pr-20 pl-10"
    type={visible ? 'text' : 'password'}
    bind:value
    {placeholder}
    autocomplete="off"
    {disabled}
  />
  <div class="absolute top-1/2 right-1 -translate-y-1/2">
    <IconButton
      type="button"
      label={visible ? m.oryxel_secret_hide() : m.oryxel_secret_show()}
      class="size-8 border-0 bg-transparent"
      onclick={() => (visible = !visible)}
    >
      {#if visible}
        <EyeOff class="size-4" />
      {:else}
        <Eye class="size-4" />
      {/if}
    </IconButton>
  </div>
</div>
