<script lang="ts">
  import { renderAssistantMarkdown } from '$lib/markdown/render-chat-markdown'
  import { cn } from '$lib/utils/cn'

  type Props = {
    role: 'user' | 'assistant'
    /** Message body (plain or markdown per contentFormat). */
    text: string
    /** Override render pipeline; default assistant → markdown, user → plain. */
    contentFormat?: 'plain' | 'markdown'
    class?: string
  }

  const { role, text, contentFormat, class: className }: Props = $props()

  const format = $derived(contentFormat ?? (role === 'assistant' ? 'markdown' : 'plain'))

  const assistantHtml = $derived(
    role === 'assistant' && format === 'markdown' ? renderAssistantMarkdown(text) : null,
  )
</script>

<div
  class={cn(
    'max-w-[85%] text-[15px] leading-relaxed shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]',
    {
      'ml-auto rounded-tl-[20px] rounded-tr-[8px] rounded-br-[20px] rounded-bl-[20px] px-5 py-3 text-[var(--oryx-fg-on-accent)]':
        role === 'user',
      'mr-auto rounded-tl-[8px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[20px] px-5 py-3 text-foreground':
        role === 'assistant',
    },
    assistantHtml === null ? 'whitespace-pre-wrap' : 'prose prose-sm max-w-none dark:prose-invert',
    className,
  )}
  style={role === 'user' ? 'background: var(--oryx-bg-chat-user);' : 'background-color: var(--oryx-bg-chat-ai);'}
>
  {#if assistantHtml !== null}
    <div class="[&_a]:text-accent [&_code]:rounded [&_code]:bg-muted/80 [&_code]:px-1 [&_code]:py-px [&_pre]:overflow-x-auto">
      <!-- eslint-disable svelte/no-at-html-tags -- sanitized via sanitize-html -->
      {@html assistantHtml}
    </div>
  {:else}
    {text}
  {/if}
</div>
