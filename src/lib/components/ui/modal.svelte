<script lang="ts">
  import { Dialog } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  import type { Snippet } from 'svelte'

  type Props = {
    open?: boolean
    title: string
    description?: string
    children?: Snippet
    footer?: Snippet
  }

  let { open = $bindable(false), title, description, children, footer }: Props = $props()
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay>
      {#snippet child({ props, open: overlayOpen })}
        <div
          {...props}
          data-state={overlayOpen ? 'open' : 'closed'}
          class={cn(
            'oryx-dialog-overlay fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]',
            props.class as string | undefined,
          )}
        ></div>
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content>
      {#snippet child({ props, open: contentOpen })}
        <div
          {...props}
          data-state={contentOpen ? 'open' : 'closed'}
          class={cn(
            'oryx-dialog-surface fixed top-1/2 left-1/2 z-50 max-h-[min(90vh,40rem)] w-[min(100%-2rem,28rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-[var(--oryx-shadow-lg)]',
            props.class as string | undefined,
          )}
        >
          <Dialog.Title class="oryx-heading text-lg font-medium tracking-tight text-foreground">{title}</Dialog.Title>
          {#if description}
            <Dialog.Description class="mt-1 text-sm text-foreground-muted">{description}</Dialog.Description>
          {/if}
          <div class="mt-4">
            {@render children?.()}
          </div>
          {#if footer}
            <div class="mt-6 flex justify-end gap-2">
              {@render footer()}
            </div>
          {/if}
          <Dialog.Close
            class="oryx-transition absolute top-4 right-4 rounded-md p-1 text-foreground-muted hover:bg-muted hover:text-foreground active:scale-95"
            aria-label="Close"
          >
            <span class="sr-only">Close</span>
            <span aria-hidden="true" class="text-lg leading-none">×</span>
          </Dialog.Close>
        </div>
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
