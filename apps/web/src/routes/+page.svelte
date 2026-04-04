<script lang="ts">
  import { Activity, List, Lock, MessageSquare, Palette, Sparkles } from '@lucide/svelte'
  import { onMount } from 'svelte'

  import LandingFeatureCard from '$lib/components/app/landing-feature-card.svelte'
  import LandingIllustHero from '$lib/components/app/landing-illust-hero.svelte'
  import LandingIllustPrivacy from '$lib/components/app/landing-illust-privacy.svelte'
  import LandingIllustStepAdd from '$lib/components/app/landing-illust-step-add.svelte'
  import LandingIllustStepAi from '$lib/components/app/landing-illust-step-ai.svelte'
  import LandingIllustStepRecommend from '$lib/components/app/landing-illust-step-recommend.svelte'
  import LandingNav from '$lib/components/app/landing-nav.svelte'
  import LandingStepCard from '$lib/components/app/landing-step-card.svelte'
  import Accordion from '$lib/components/ui/accordion.svelte'
  import * as m from '$lib/paraglide/messages.js'

  const features = $derived([
    {
      icon: MessageSquare,
      title: m.oryxel_public_feat_chat_title(),
      description: m.oryxel_public_feat_chat_desc(),
    },
    {
      icon: List,
      title: m.oryxel_public_feat_tables_title(),
      description: m.oryxel_public_feat_tables_desc(),
    },
    {
      icon: Palette,
      title: m.oryxel_public_feat_themes_title(),
      description: m.oryxel_public_feat_themes_desc(),
    },
    {
      icon: Lock,
      title: m.oryxel_public_feat_privacy_title(),
      description: m.oryxel_public_feat_privacy_desc(),
    },
    {
      icon: Sparkles,
      title: m.oryxel_public_feat_export_title(),
      description: m.oryxel_public_feat_export_desc(),
    },
    {
      icon: Activity,
      title: m.oryxel_public_feat_multi_ai_title(),
      description: m.oryxel_public_feat_multi_ai_desc(),
    },
  ])

  const audience = $derived([
    {
      emoji: '🫧',
      title: m.oryxel_public_audience_item1_title(),
      desc: m.oryxel_public_audience_item1_desc(),
    },
    {
      emoji: '✨',
      title: m.oryxel_public_audience_item2_title(),
      desc: m.oryxel_public_audience_item2_desc(),
    },
    {
      emoji: '🎁',
      title: m.oryxel_public_audience_item3_title(),
      desc: m.oryxel_public_audience_item3_desc(),
    },
    {
      emoji: '🌹',
      title: m.oryxel_public_audience_item4_title(),
      desc: m.oryxel_public_audience_item4_desc(),
    },
  ])

  const faqItems = $derived([
    { question: m.oryxel_public_faq_q1(), answer: m.oryxel_public_faq_a1() },
    { question: m.oryxel_public_faq_q2(), answer: m.oryxel_public_faq_a2() },
    { question: m.oryxel_public_faq_q3(), answer: m.oryxel_public_faq_a3() },
    { question: m.oryxel_public_faq_q4(), answer: m.oryxel_public_faq_a4() },
    { question: m.oryxel_public_faq_q5(), answer: m.oryxel_public_faq_a5() },
    { question: m.oryxel_public_faq_q6(), answer: m.oryxel_public_faq_a6() },
  ])

  const privacyItems = $derived([
    m.oryxel_public_privacy_item_encryption(),
    m.oryxel_public_privacy_item_one_click_delete(),
    m.oryxel_public_privacy_item_open_source(),
    m.oryxel_public_privacy_export(),
  ])

  const freeItems = $derived([
    m.oryxel_public_free_item_open_code(),
    m.oryxel_public_free_item_encrypted_storage(),
    m.oryxel_public_free_item_community(),
  ])

  // IntersectionObserver for scroll-reveal
  onMount(() => {
    const reveals = document.querySelectorAll('.landing-reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12 },
    )

    for (const element of reveals) {
      observer.observe(element)
    }

    return () => observer.disconnect()
  })
</script>

<LandingNav />

<div class="overflow-x-hidden" style="background: var(--landing-page-gradient);">
  <!-- ──────────────────────────────────────────────────────── -->
  <!-- Section 1: Hero                                         -->
  <!-- ──────────────────────────────────────────────────────── -->
  <section class="relative px-4 py-20 md:py-28 lg:py-36">
    <!-- Subtle grain overlay -->
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.03]"
      style="background-image: url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;);"
    ></div>

    <div class="relative mx-auto flex max-w-6xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
      <!-- Text -->
      <div class="landing-fade-in flex flex-col items-center text-center lg:w-1/2 lg:items-start lg:text-left">
        <p class="mb-4 text-xs font-semibold tracking-[0.18em] uppercase" style="color: var(--landing-gold-text);">
          {m.oryxel_public_badge()}
        </p>
        <h1
          class="oryx-heading text-4xl leading-tight font-semibold tracking-wide text-foreground md:text-5xl lg:text-6xl"
        >
          {m.oryxel_public_hero_title()}
        </h1>
        <p class="mt-5 max-w-lg text-base leading-relaxed text-foreground-muted md:text-lg">
          {m.oryxel_public_hero_desc()}
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
          <a
            href="/login?redirectTo=/diary&intent=signup"
            class="rounded-full px-7 py-3 text-sm font-medium shadow-md transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.98]"
            style="background: var(--landing-gradient-cta); color: var(--oryx-btn-primary-fg);"
          >
            {m.oryxel_public_cta_start_free()}
          </a>
          <a
            href="/login?redirectTo=/diary"
            class="rounded-full border border-border bg-surface px-7 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            {m.oryxel_public_hero_demo_cta()}
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer noopener"
            class="rounded-full border border-border bg-surface px-7 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            {m.oryxel_public_cta_github()}
          </a>
        </div>
      </div>

      <!-- Hero illustration -->
      <div class="landing-float flex justify-center lg:w-1/2">
        <LandingIllustHero class="w-full max-w-[380px] md:max-w-[440px]" />
      </div>
    </div>
  </section>

  <!-- ──────────────────────────────────────────────────────── -->
  <!-- Section 2: How it works                                 -->
  <!-- ──────────────────────────────────────────────────────── -->
  <section class="px-4 py-20 md:py-24">
    <div class="mx-auto max-w-6xl">
      <div class="landing-reveal mb-12 text-center">
        <h2 class="oryx-heading text-3xl font-semibold text-foreground md:text-4xl">
          {m.oryxel_public_steps_title()}
        </h2>
        <div class="mx-auto mt-3 h-px w-16" style="background: var(--landing-accent-gold); opacity: 0.5;"></div>
      </div>
      <div class="grid gap-6 md:grid-cols-3">
        <div class="landing-reveal">
          <LandingStepCard
            step={1}
            title={m.oryxel_public_step1_title()}
            description={m.oryxel_public_step1_desc()}
            illustration={LandingIllustStepAdd}
          />
        </div>
        <div class="landing-reveal" style="transition-delay: 0.1s;">
          <LandingStepCard
            step={2}
            title={m.oryxel_public_step2_title()}
            description={m.oryxel_public_step2_desc()}
            illustration={LandingIllustStepAi}
          />
        </div>
        <div class="landing-reveal" style="transition-delay: 0.2s;">
          <LandingStepCard
            step={3}
            title={m.oryxel_public_step3_title()}
            description={m.oryxel_public_step3_desc()}
            illustration={LandingIllustStepRecommend}
          />
        </div>
      </div>
    </div>
  </section>

  <!-- ──────────────────────────────────────────────────────── -->
  <!-- Section 3: Features                                     -->
  <!-- ──────────────────────────────────────────────────────── -->
  <section id="features" class="px-4 py-20 md:py-24">
    <div class="mx-auto max-w-6xl">
      <div class="landing-reveal mb-12 text-center">
        <h2 class="oryx-heading text-3xl font-semibold text-foreground md:text-4xl">
          {m.oryxel_public_features_title()}
        </h2>
        <div class="mx-auto mt-3 h-px w-16" style="background: var(--landing-accent-gold); opacity: 0.5;"></div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each features as feat, index (feat.title)}
          <div class="landing-reveal" style="transition-delay: {index * 0.07}s;">
            <LandingFeatureCard icon={feat.icon} title={feat.title} description={feat.description} />
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ──────────────────────────────────────────────────────── -->
  <!-- Section 4: Audience                                     -->
  <!-- ──────────────────────────────────────────────────────── -->
  <section class="px-4 py-20 md:py-24">
    <div class="mx-auto max-w-6xl">
      <div class="landing-reveal mb-12 text-center">
        <h2 class="oryx-heading text-3xl font-semibold text-foreground md:text-4xl">
          {m.oryxel_public_audience_title()}
        </h2>
        <div class="mx-auto mt-3 h-px w-16" style="background: var(--landing-accent-gold); opacity: 0.5;"></div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {#each audience as item, index (item.title)}
          <div
            class="landing-card-hover landing-reveal flex flex-col gap-3 rounded-2xl border border-border p-6"
            style="background: var(--landing-card-bg); transition-delay: {index * 0.07}s;"
          >
            <span class="text-3xl">{item.emoji}</span>
            <h3 class="oryx-heading text-lg font-semibold text-foreground">{item.title}</h3>
            <p class="text-sm leading-relaxed text-foreground-muted">{item.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ──────────────────────────────────────────────────────── -->
  <!-- Section 5: Privacy                                      -->
  <!-- ──────────────────────────────────────────────────────── -->
  <section id="privacy" class="px-4 py-20 md:py-28">
    <div class="mx-auto flex max-w-6xl flex-col items-center gap-12 md:flex-row md:gap-16">
      <!-- Illustration -->
      <div class="landing-reveal flex justify-center md:w-2/5">
        <LandingIllustPrivacy class="w-full max-w-[280px]" />
      </div>

      <!-- Content -->
      <div class="landing-reveal flex flex-col gap-6 text-center md:w-3/5 md:text-left" style="transition-delay: 0.1s;">
        <div>
          <p class="mb-3 text-xs font-semibold tracking-[0.18em] uppercase" style="color: var(--landing-gold-text);">
            {m.oryxel_public_badge()}
          </p>
          <h2 class="oryx-heading text-3xl leading-tight font-semibold text-foreground md:text-4xl">
            {m.oryxel_public_privacy_title()}
          </h2>
          <p class="mt-4 text-base leading-relaxed text-foreground-muted">
            {m.oryxel_public_privacy_desc()}
          </p>
        </div>
        <ul class="flex flex-col gap-3">
          {#each privacyItems as item (item)}
            <li class="flex items-start gap-3">
              <span
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style="background: var(--landing-accent-gold); opacity: 0.85;"
              >
                <svg
                  viewBox="0 0 10 10"
                  fill="none"
                  class="h-2.5 w-2.5"
                  stroke="white"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M2 5 L4 7 L8 3" />
                </svg>
              </span>
              <span class="text-sm leading-relaxed text-foreground-muted">{item}</span>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </section>

  <!-- ──────────────────────────────────────────────────────── -->
  <!-- Section 6: Why Free                                     -->
  <!-- ──────────────────────────────────────────────────────── -->
  <section class="px-4 py-20 md:py-24">
    <div class="mx-auto max-w-3xl">
      <div
        class="landing-reveal rounded-3xl border border-border p-10 text-center md:p-14"
        style="background: var(--landing-card-bg);"
      >
        <p class="mb-3 text-xs font-semibold tracking-[0.18em] uppercase" style="color: var(--landing-gold-text);">
          Open Source
        </p>
        <h2 class="oryx-heading text-3xl font-semibold text-foreground md:text-4xl">
          {m.oryxel_public_free_title()}
        </h2>
        <p class="mx-auto mt-4 max-w-xl text-base leading-relaxed text-foreground-muted">
          {m.oryxel_public_free_desc()}
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          {#each freeItems as item (item)}
            <span
              class="rounded-full border border-border px-4 py-2 text-sm"
              style="background: var(--landing-section-alt);"
            >
              {item}
            </span>
          {/each}
        </div>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="/login?redirectTo=/diary&intent=signup"
            class="rounded-full px-7 py-3 text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
            style="background: var(--landing-gradient-cta); color: var(--oryx-btn-primary-fg);"
          >
            {m.oryxel_public_cta_start_free()}
          </a>
          <a
            href="https://github.com/sponsors"
            target="_blank"
            rel="noreferrer noopener"
            class="rounded-full border border-border bg-surface px-7 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            {m.oryxel_public_free_donate_cta()}
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- ──────────────────────────────────────────────────────── -->
  <!-- Section 7: FAQ                                          -->
  <!-- ──────────────────────────────────────────────────────── -->
  <section id="faq" class="px-4 py-20 md:py-24">
    <div class="mx-auto max-w-3xl">
      <div class="landing-reveal mb-10 text-center">
        <h2 class="oryx-heading text-3xl font-semibold text-foreground md:text-4xl">
          {m.oryxel_public_faq_title()}
        </h2>
        <div class="mx-auto mt-3 h-px w-16" style="background: var(--landing-accent-gold); opacity: 0.5;"></div>
      </div>
      <div
        class="landing-reveal rounded-2xl border border-border px-6 md:px-8"
        style="background: var(--landing-card-bg);"
      >
        <Accordion items={faqItems} />
      </div>
    </div>
  </section>

  <!-- ──────────────────────────────────────────────────────── -->
  <!-- Section 8: Footer                                       -->
  <!-- ──────────────────────────────────────────────────────── -->
  <footer class="border-t border-border px-4 py-12" style="background: var(--landing-privacy-bg);">
    <div class="mx-auto max-w-6xl">
      <div class="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
        <!-- Brand -->
        <div class="flex flex-col items-center gap-3 md:items-start">
          <span class="oryx-heading text-2xl font-semibold" style="color: var(--landing-accent-gold);"> Oryxel </span>
          <span
            class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
            style="border-color: rgba(196,169,130,0.3); color: rgba(240,236,228,0.5);"
          >
            <span class="h-1.5 w-1.5 rounded-full" style="background: var(--landing-accent-gold);"></span>
            {m.oryxel_public_footer_open_source_badge()}
          </span>
          <p class="text-xs" style="color: rgba(240,236,228,0.4);">
            {m.oryxel_public_footer_copyright()}
          </p>
        </div>

        <!-- Nav links -->
        <nav class="flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-end">
          <a
            href="#features"
            class="text-sm transition-colors hover:opacity-100"
            style="color: rgba(240,236,228,0.55);"
          >
            {m.oryxel_public_nav_features()}
          </a>
          <a href="#privacy" class="text-sm transition-colors hover:opacity-100" style="color: rgba(240,236,228,0.55);">
            {m.oryxel_public_nav_privacy()}
          </a>
          <a href="#faq" class="text-sm transition-colors hover:opacity-100" style="color: rgba(240,236,228,0.55);">
            {m.oryxel_public_nav_faq()}
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer noopener"
            class="text-sm transition-colors hover:opacity-100"
            style="color: rgba(240,236,228,0.55);"
          >
            {m.oryxel_public_nav_github()}
          </a>
          <a
            href="https://github.com/sponsors"
            target="_blank"
            rel="noreferrer noopener"
            class="text-sm transition-colors hover:opacity-100"
            style="color: rgba(240,236,228,0.55);"
          >
            {m.oryxel_public_footer_sponsors()}
          </a>
        </nav>
      </div>
    </div>
  </footer>
</div>
