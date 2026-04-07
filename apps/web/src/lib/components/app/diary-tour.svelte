<script lang="ts">
  import { driver } from 'driver.js'
  import 'driver.js/dist/driver.css'
  import { onMount } from 'svelte'

  import * as m from '$lib/paraglide/messages.js'

  import { browser } from '$app/environment'

  type Props = {
    completed: boolean
    onComplete: () => void
    onReady: (startFunction: () => void) => void
    prepareChatPanel?: () => void
  }

  const { completed, onComplete, onReady, prepareChatPanel }: Props = $props()

  function firstVisible(selector: string): HTMLElement | undefined {
    const nodes = document.querySelectorAll<HTMLElement>(selector)

    for (const element of nodes) {
      const style = getComputedStyle(element)

      if (style.display === 'none' || style.visibility === 'hidden') continue

      const rect = element.getBoundingClientRect()

      if (rect.width < 2 || rect.height < 2) continue

      return element
    }
  }

  function isMobileWidth(): boolean {
    return browser && globalThis.matchMedia('(max-width: 767px)').matches
  }

  async function markCompleted(): Promise<void> {
    if (completed) return

    try {
      await fetch('/api/user/onboarding', { method: 'POST' })
    } catch {
      // silently ignore — UX continues regardless
    }
    onComplete()
  }

  onMount(() => {
    if (!browser) return

    const driverObject = driver({
      showProgress: true,
      progressText: m.oryxel_tour_step_of({ current: '{{current}}', total: '{{total}}' }),
      nextBtnText: m.oryxel_tour_next(),
      prevBtnText: m.oryxel_tour_back(),
      doneBtnText: m.oryxel_tour_finish(),
      allowClose: true,
      overlayOpacity: 0.62,
      smoothScroll: true,
      steps: [
        {
          popover: {
            title: m.oryxel_tour_welcome_title(),
            description: m.oryxel_tour_welcome_desc(),
            side: 'over',
            align: 'center',
          },
        },
        {
          element: () => {
            prepareChatPanel?.()

            return (
              firstVisible('[data-tour="chat-panel"]') ??
              (document.querySelector('[data-tour="diary-primary-tabs"]') as HTMLElement | null) ??
              document.body
            )
          },
          onHighlighted: (_element, _step, { driver: drv }) => {
            if (firstVisible('[data-tour="chat-panel"]')) return

            requestAnimationFrame(() => {
              requestAnimationFrame(() => drv.refresh())
            })
          },
          popover: {
            title: m.oryxel_tour_chat_title(),
            description: m.oryxel_tour_chat_desc(),
            side: isMobileWidth() ? 'top' : 'right',
            align: isMobileWidth() ? 'center' : 'start',
          },
        },
        {
          element: () =>
            firstVisible('[data-tour="chat-input"]') ?? firstVisible('[data-tour="chat-panel"]') ?? document.body,
          popover: {
            title: m.oryxel_tour_input_title(),
            description: m.oryxel_tour_input_desc(),
            side: 'top',
            align: isMobileWidth() ? 'center' : 'start',
          },
        },
        {
          element: '[data-tour="diary-primary-tabs"]',
          popover: {
            title: m.oryxel_tour_tabs_title(),
            description: m.oryxel_tour_tabs_desc(),
            side: 'top',
            align: isMobileWidth() ? 'center' : 'start',
          },
        },
        {
          element: '[data-tour="diary-table"]',
          onHighlightStarted: () => {
            document.querySelector<HTMLElement>('[data-tour="primary-fragrances"]')?.click()
            requestAnimationFrame(() => {
              document.querySelector<HTMLElement>('[data-tour="fragrance-list-owned"]')?.click()
            })
          },
          popover: {
            title: m.oryxel_tour_table_title(),
            description: m.oryxel_tour_table_desc(),
            side: 'bottom',
            align: isMobileWidth() ? 'center' : 'start',
          },
        },
        {
          element: () =>
            firstVisible('[data-tour="profile-header"]') ??
            (document.querySelector('[data-tour="diary-primary-tabs"]') as HTMLElement | null) ??
            document.body,
          onHighlightStarted: () => {
            document.querySelector<HTMLElement>('[data-tour="primary-profile"]')?.click()
          },
          onHighlighted: (_element, _step, { driver: drv }) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => drv.refresh())
            })
          },
          popover: {
            title: m.oryxel_tour_profile_title(),
            description: m.oryxel_tour_profile_desc(),
            side: 'bottom',
            align: isMobileWidth() ? 'center' : 'start',
          },
        },
        {
          element: '[data-tour="profile-radar"]',
          popover: {
            title: m.oryxel_tour_profile_radar_title(),
            description: m.oryxel_tour_profile_radar_desc(),
            side: isMobileWidth() ? 'top' : 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="notes-view-toggle"]',
          onHighlightStarted: () => {
            document.querySelector<HTMLElement>('[data-tour="primary-notes"]')?.click()
          },
          popover: {
            title: m.oryxel_tour_notes_title(),
            description: m.oryxel_tour_notes_desc(),
            side: 'bottom',
            align: isMobileWidth() ? 'center' : 'end',
          },
        },
        {
          element: '[data-tour="notes-content"]',
          popover: {
            title: m.oryxel_tour_notes_sentiments_title(),
            description: m.oryxel_tour_notes_sentiments_desc(),
            side: 'top',
            align: isMobileWidth() ? 'center' : 'start',
          },
        },
        {
          element: () => {
            document.querySelector<HTMLElement>('[data-tour="primary-profile"]')?.click()

            return (
              firstVisible('[data-tour="profile-settings"]') ??
              firstVisible('[data-tour="profile-header"]') ??
              (document.querySelector('[data-tour="diary-primary-tabs"]') as HTMLElement | null) ??
              document.body
            )
          },
          onHighlighted: (_element, _step, { driver: drv }) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => drv.refresh())
            })
          },
          popover: {
            title: m.oryxel_tour_settings_title(),
            description: m.oryxel_tour_settings_desc(),
            side: isMobileWidth() ? 'top' : 'bottom',
            align: isMobileWidth() ? 'center' : 'end',
          },
        },
        {
          popover: {
            title: m.oryxel_tour_done_title(),
            description: m.oryxel_tour_done_desc(),
            side: 'over',
            align: 'center',
          },
        },
      ],
      onDestroyed: () => {
        void markCompleted()
      },
    })

    onReady(() => driverObject.drive())

    return () => {
      if (driverObject.isActive()) driverObject.destroy()
    }
  })
</script>

<style>
  :global(.driver-overlay) {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 40 !important;
  }

  :global(.driver-active-element) {
    z-index: 41 !important;
  }

  :global(.driver-popover) {
    z-index: 50 !important;
    background-color: var(--color-surface) !important;
    color: var(--color-foreground) !important;
    border: 1px solid var(--color-border) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18) !important;
    min-width: 280px !important;
    max-width: 320px !important;
    padding: 18px !important;
  }

  :global(.driver-popover-title) {
    font-size: 15px !important;
    font-weight: 600 !important;
    color: var(--color-foreground) !important;
    letter-spacing: -0.02em !important;
    font-family: inherit !important;
  }

  :global(.driver-popover-description) {
    font-size: 13px !important;
    line-height: 1.55 !important;
    color: var(--color-foreground-muted) !important;
    margin-top: 6px !important;
    font-family: inherit !important;
  }

  :global(.driver-popover-progress-text) {
    font-size: 12px !important;
    color: var(--color-foreground-muted) !important;
  }

  :global(.driver-popover-close-btn) {
    color: var(--color-foreground-muted) !important;
  }

  :global(.driver-popover-close-btn:hover),
  :global(.driver-popover-close-btn:focus) {
    color: var(--color-foreground) !important;
  }

  :global(.driver-popover-footer) {
    margin-top: 14px !important;
  }

  :global(.driver-popover-footer button) {
    padding: 5px 12px !important;
    border-radius: 7px !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    font-family: inherit !important;
  }

  :global(.driver-popover-prev-btn) {
    background-color: var(--color-muted) !important;
    border-color: var(--color-border) !important;
    color: var(--color-foreground) !important;
    text-shadow: none !important;
  }

  :global(.driver-popover-prev-btn:hover) {
    background-color: var(--color-subtle) !important;
  }

  :global(.driver-popover-next-btn) {
    background-color: var(--color-accent) !important;
    border-color: var(--color-accent) !important;
    color: var(--color-on-accent, #fff) !important;
    text-shadow: none !important;
  }

  :global(.driver-popover-next-btn:hover) {
    opacity: 0.88 !important;
  }

  :global(.driver-popover-arrow-side-left) {
    border-left-color: var(--color-surface) !important;
  }

  :global(.driver-popover-arrow-side-right) {
    border-right-color: var(--color-surface) !important;
  }

  :global(.driver-popover-arrow-side-top) {
    border-top-color: var(--color-surface) !important;
  }

  :global(.driver-popover-arrow-side-bottom) {
    border-bottom-color: var(--color-surface) !important;
  }
</style>
