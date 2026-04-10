<script lang="ts">
  import Modal from '$lib/components/ui/modal.svelte'
  import * as m from '$lib/paraglide/messages.js'
  import { type ParsedTableOp, parsePatchPreview, patchPreviewHasBody } from '$lib/patch/parse-patch-preview'

  interface Props {
    open?: boolean
    payload: Record<string, unknown> | null
    /** Shown under the title (e.g. patch summary line). */
    subtitle?: string | null
  }

  let { open = $bindable(false), payload, subtitle = null }: Props = $props()

  const preview = $derived(payload ? parsePatchPreview(payload) : null)
  const rawJson = $derived(payload ? JSON.stringify(payload, null, 2) : '')

  function opTitle(op: ParsedTableOp['op']): string {
    switch (op) {
      case 'add': {
        return m.oryxel_patch_op_add()
      }

      case 'move': {
        return m.oryxel_patch_op_move()
      }

      case 'remove': {
        return m.oryxel_patch_op_remove()
      }

      case 'rate': {
        return m.oryxel_patch_op_rate()
      }

      case 'status': {
        return m.oryxel_patch_op_status()
      }
      default: {
        return op
      }
    }
  }

  function flagParts(op: ParsedTableOp): string[] {
    const p: string[] = []

    if (op.isOwned === true) p.push(m.oryxel_patch_flag_owned())

    if (op.isTried === true) p.push(m.oryxel_patch_flag_tried())

    if (op.isLiked === true) p.push(m.oryxel_patch_flag_liked())

    if (op.isDisliked === true) p.push(m.oryxel_patch_flag_disliked())

    return p
  }
</script>

<Modal
  bind:open
  title={m.oryxel_patch_details_title()}
  description={subtitle ?? undefined}
  surfaceClass="w-[min(100%-1.5rem,36rem)] max-w-none md:w-[min(100%-2rem,42rem)]"
>
  {#if preview}
    <div class="space-y-5 text-sm">
      <section class="rounded-xl border border-border/80 bg-muted/25 px-4 py-3">
        <h4 class="text-xs font-semibold tracking-wide text-foreground-muted uppercase">
          {m.oryxel_patch_section_summary()}
        </h4>
        {#if preview.summary}
          <p class="mt-1.5 text-foreground">{preview.summary}</p>
        {/if}
        {#if preview.reply}
          <p class="mt-2 text-foreground-muted">{preview.reply}</p>
        {/if}
        {#if preview.confidence !== undefined}
          <p class="mt-2 text-xs text-foreground-muted">
            {m.oryxel_patch_field_confidence({ value: preview.confidence.toFixed(2) })}
          </p>
        {/if}
        {#if !preview.summary && !preview.reply && preview.confidence === undefined}
          <p class="mt-1 text-foreground-muted">{m.oryxel_patch_section_summary_empty()}</p>
        {/if}
      </section>

      {#if preview.tableOps.length > 0}
        <section>
          <h4 class="mb-2 text-xs font-semibold tracking-wide text-foreground-muted uppercase">
            {m.oryxel_patch_section_diary()}
          </h4>
          <ul class="space-y-2">
            {#each preview.tableOps as op, index (index)}
              <li class="rounded-xl border border-border/70 bg-surface px-3 py-2.5 shadow-sm">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent"
                    >{opTitle(op.op)}</span
                  >
                  {#if op.rowId != null}
                    <span class="text-xs text-foreground-muted">{m.oryxel_patch_row({ id: String(op.rowId) })}</span>
                  {/if}
                </div>
                {#if op.brandName || op.fragranceName}
                  <p class="mt-1.5 font-medium text-foreground">
                    {op.brandName ?? '—'} — {op.fragranceName ?? '—'}
                  </p>
                {/if}
                {#if flagParts(op).length > 0}
                  <p class="mt-1 text-xs text-foreground-muted">{flagParts(op).join(' · ')}</p>
                {/if}
                {#if op.rating !== undefined}
                  <p class="mt-1 text-xs text-foreground-muted">
                    {m.oryxel_patch_rating_value({ value: String(op.rating) })}
                  </p>
                {/if}
                {#if op.notesSummary}
                  <p class="mt-1 text-xs text-foreground-muted">{op.notesSummary}</p>
                {/if}
                {#if op.pyramidTop || op.pyramidMid || op.pyramidBase}
                  <p class="mt-1 font-mono text-[11px] leading-relaxed text-foreground-muted">
                    {#if op.pyramidTop}<span class="block">T: {op.pyramidTop}</span>{/if}
                    {#if op.pyramidMid}<span class="block">M: {op.pyramidMid}</span>{/if}
                    {#if op.pyramidBase}<span class="block">B: {op.pyramidBase}</span>{/if}
                  </p>
                {/if}
                {#if op.agentComment}
                  <p class="mt-1 text-xs text-foreground-muted italic">{op.agentComment}</p>
                {/if}
                {#if op.userComment}
                  <p class="mt-1 text-xs text-foreground-muted">“{op.userComment}”</p>
                {/if}
                {#if op.season || op.timeOfDay || op.gender}
                  <p class="mt-1 text-[11px] text-foreground-muted">
                    {[op.season, op.timeOfDay, op.gender].filter(Boolean).join(' · ')}
                  </p>
                {/if}
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if preview.profile}
        <section>
          <h4 class="mb-2 text-xs font-semibold tracking-wide text-foreground-muted uppercase">
            {m.oryxel_patch_section_profile()}
          </h4>
          <div class="space-y-2 rounded-xl border border-border/70 bg-surface px-3 py-3 text-sm shadow-sm">
            {#if preview.profile.archetype}
              <p>
                <span class="text-foreground-muted">{m.oryxel_patch_profile_archetype()}</span>
                {preview.profile.archetype}
              </p>
            {/if}
            {#if preview.profile.favoriteNote}
              <p>
                <span class="text-foreground-muted">{m.oryxel_patch_profile_favorite_note()}</span>
                {preview.profile.favoriteNote}
              </p>
            {/if}
            {#if preview.profile.preferences}
              <p>
                <span class="text-foreground-muted">{m.oryxel_patch_profile_preferences()}</span>
                <span class="whitespace-pre-wrap text-foreground">{preview.profile.preferences}</span>
              </p>
            {/if}
            {#if preview.profile.rationale}
              <p>
                <span class="text-foreground-muted">{m.oryxel_patch_profile_rationale()}</span>
                {preview.profile.rationale}
              </p>
            {/if}
            {#if preview.profile.radar && Object.keys(preview.profile.radar).length > 0}
              <div>
                <p class="text-foreground-muted">{m.oryxel_patch_profile_radar()}</p>
                <ul class="mt-1 flex flex-wrap gap-1.5">
                  {#each Object.entries(preview.profile.radar) as [axis, value] (axis)}
                    <li class="rounded-md bg-muted/80 px-2 py-0.5 text-xs tabular-nums">
                      {axis}: {value}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            {#if preview.profile.noteRelationships && preview.profile.noteRelationships.length > 0}
              <div>
                <p class="text-foreground-muted">
                  {m.oryxel_patch_profile_notes_count({ count: String(preview.profile.noteRelationships.length) })}
                </p>
                <ul class="mt-1 space-y-1.5 text-xs">
                  {#each preview.profile.noteRelationships as nr (nr.note + nr.sentiment)}
                    <li class="rounded-md border border-border/60 px-2 py-1.5">
                      <span class="font-medium text-foreground">{nr.label}</span>
                      <span class="text-foreground-muted"> ({nr.note}, {nr.sentiment})</span>
                      {#if nr.agentComment}
                        <span class="mt-0.5 block text-foreground-muted">{nr.agentComment}</span>
                      {/if}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </section>
      {/if}

      {#if preview.recommendations.length > 0}
        <section>
          <h4 class="mb-2 text-xs font-semibold tracking-wide text-foreground-muted uppercase">
            {m.oryxel_patch_section_recommendations()}
          </h4>
          <ul class="space-y-2">
            {#each preview.recommendations as rec (rec.id)}
              <li class="rounded-xl border border-border/70 bg-surface px-3 py-2 shadow-sm">
                <p class="font-medium text-foreground">{rec.brand} — {rec.name}</p>
                {#if rec.tag}
                  <p class="mt-1 text-xs text-foreground-muted">{rec.tag}</p>
                {/if}
                {#if rec.notesSummary}
                  <p class="mt-1 text-xs text-foreground-muted">{rec.notesSummary}</p>
                {/if}
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if preview.suggestions.length > 0}
        <section>
          <h4 class="mb-2 text-xs font-semibold tracking-wide text-foreground-muted uppercase">
            {m.oryxel_patch_section_suggestions()}
          </h4>
          <ul class="list-inside list-disc space-y-1 text-foreground-muted">
            {#each preview.suggestions as s (s)}
              <li>{s}</li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if preview.agentMemoryOps.length > 0}
        <section>
          <h4 class="mb-2 text-xs font-semibold tracking-wide text-foreground-muted uppercase">
            {m.oryxel_patch_section_memory()}
          </h4>
          <ul class="space-y-2">
            {#each preview.agentMemoryOps as mem, mi (mi)}
              <li class="rounded-xl border border-border/70 bg-surface px-3 py-2 text-xs shadow-sm">
                {#if mem.op === 'add' && mem.content}
                  {m.oryxel_patch_mem_add({ content: mem.content })}
                {:else if mem.op === 'update' && mem.id != null && mem.content}
                  {m.oryxel_patch_mem_update({ id: String(mem.id), content: mem.content })}
                {:else if mem.op === 'remove' && mem.id != null}
                  {m.oryxel_patch_mem_remove({ id: String(mem.id) })}
                {:else}
                  {mem.op}{#if mem.id != null}
                    #{mem.id}{/if}{#if mem.content}: {mem.content}{/if}
                {/if}
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if preview && !patchPreviewHasBody(preview)}
        <p class="text-sm text-foreground-muted">{m.oryxel_patch_no_structured_changes()}</p>
      {/if}

      <details class="group rounded-xl border border-dashed border-border/80 bg-muted/15 px-3 py-2">
        <summary class="cursor-pointer text-xs font-medium text-foreground-muted hover:text-foreground">
          {m.oryxel_patch_raw_toggle()}
        </summary>
        <pre
          class="mt-2 max-h-48 overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-[11px] leading-relaxed text-foreground-muted">{rawJson}</pre>
      </details>
    </div>
  {:else}
    <p class="text-sm text-foreground-muted">{m.oryxel_patch_no_payload()}</p>
  {/if}
</Modal>
