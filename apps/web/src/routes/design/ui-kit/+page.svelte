<script lang="ts">
  import Badge from '$lib/components/ui/badge.svelte'
  import Button from '$lib/components/ui/button.svelte'
  import Card from '$lib/components/ui/card.svelte'
  import CheckboxField from '$lib/components/ui/checkbox-field.svelte'
  import Chip from '$lib/components/ui/chip.svelte'
  import Input from '$lib/components/ui/input.svelte'
  import Label from '$lib/components/ui/label.svelte'
  import RatingStars from '$lib/components/ui/rating-stars.svelte'
  import SwitchField from '$lib/components/ui/switch-field.svelte'
  import Textarea from '$lib/components/ui/textarea.svelte'
  import ThemePreviewCard from '$lib/components/ui/theme-preview-card.svelte'

  import type { OryxelThemeId } from '$lib/theme/constants'

  let rating = $state(3)
  let sw = $state(false)

  const themes: OryxelThemeId[] = ['light-aura', 'midnight-scent', 'botanical', 'rose-blush', 'lavender-mist']
</script>

<div class="mx-auto max-w-[960px] space-y-10 bg-background px-4 py-8 md:px-8">
  <h1 class="oryx-heading text-2xl font-medium">UI kit</h1>

  <p class="text-sm text-foreground-muted">
    Tokens: Inter (body) + Outfit (headings), radii from <code class="rounded bg-muted px-1">layout.css</code>, cards
    <code class="rounded bg-muted px-1">rounded-2xl</code>.
  </p>

  <section class="space-y-3">
    <h2 class="text-sm font-medium tracking-wide text-foreground-muted uppercase">Buttons</h2>
    <div class="flex flex-wrap gap-2">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button disabled>Disabled</Button>
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium tracking-wide text-foreground-muted uppercase">Form</h2>
    <Card class="max-w-md space-y-3 p-4">
      <div>
        <Label for="demo-input">Label</Label>
        <Input id="demo-input" class="mt-1" placeholder="Placeholder" />
      </div>
      <div>
        <Label for="demo-ta">Textarea</Label>
        <Textarea id="demo-ta" class="mt-1" />
      </div>
      <div class="flex items-center gap-3">
        <CheckboxField aria-label="Demo checkbox" />
        <SwitchField bind:checked={sw} label="Switch" id="sw-demo" />
      </div>
      <RatingStars bind:value={rating} />
    </Card>
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium tracking-wide text-foreground-muted uppercase">Badges & chips</h2>
    <div class="flex flex-wrap gap-2">
      <Badge>Neutral</Badge>
      <Badge tone="success">Success</Badge>
      <Badge tone="warning">Warning</Badge>
      <Badge tone="destructive">Destructive</Badge>
      <Badge tone="accent">Accent</Badge>
      <Chip>Chip</Chip>
      <Chip selected>Selected</Chip>
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium tracking-wide text-foreground-muted uppercase">Theme previews</h2>
    <div class="grid gap-3 sm:grid-cols-3">
      {#each themes as t (t)}
        <ThemePreviewCard themeId={t} title={t} />
      {/each}
    </div>
  </section>
</div>
