<script lang="ts">
  interface AccordionItem {
    question: string
    answer: string
  }

  let { items }: { items: AccordionItem[] } = $props()

  let openIndex = $state<number | null>(null)

  function toggle(index: number) {
    openIndex = openIndex === index ? null : index
  }
</script>

<div class="divide-y divide-border">
  {#each items as item, index (index)}
    <div>
      <button
        class="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={openIndex === index}
        onclick={() => toggle(index)}
      >
        <span class="text-base leading-snug font-medium text-foreground">{item.question}</span>
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border transition-transform duration-200"
          style={openIndex === index ? 'transform: rotate(45deg);' : ''}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 12 12"
            fill="none"
            class="h-3 w-3"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          >
            <line x1="6" y1="1" x2="6" y2="11" />
            <line x1="1" y1="6" x2="11" y2="6" />
          </svg>
        </span>
      </button>
      <div
        class="accordion-body overflow-hidden"
        style="display: grid; grid-template-rows: {openIndex === index
          ? '1fr'
          : '0fr'}; transition: grid-template-rows 0.28s ease;"
      >
        <div class="min-h-0">
          <p class="pb-5 text-sm leading-relaxed text-foreground-muted">{item.answer}</p>
        </div>
      </div>
    </div>
  {/each}
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    .accordion-body {
      transition: none !important;
    }
  }
</style>
