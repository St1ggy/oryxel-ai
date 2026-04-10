<script lang="ts">
  import { driver } from 'driver.js'
  import 'driver.js/dist/driver.css'
  import { onMount, tick } from 'svelte'

  import * as m from '$lib/paraglide/messages.js'

  import type { DriveStep } from 'driver.js'

  import { browser } from '$app/environment'

  interface Props {
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

  /** Clicks the first matching element that is actually on screen (skips `hidden md:flex` desktop clones). */
  function clickTourTarget(selector: string): void {
    firstVisible(selector)?.click()
  }

  function tourElement(selector: string): HTMLElement {
    return firstVisible(selector) ?? document.body
  }

  /** driver.js resolves `element` before `onHighlightStarted`, so tab switches must run from the *previous* step’s Next via `tick()`. */
  async function afterTabSwitchNavigate(drv: { moveNext: () => void }, function_: () => void): Promise<void> {
    function_()
    await tick()
    await tick()
    drv.moveNext()
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

  function scheduleDriverRefresh(drv: { refresh: () => void }): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => drv.refresh())
    })
  }

  function buildTourSteps(mobile: boolean): DriveStep[] {
    return [
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

          return firstVisible('[data-tour="chat-panel"]') ?? tourElement('[data-tour="diary-primary-tabs"]')
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
          side: mobile ? 'top' : 'right',
          align: mobile ? 'center' : 'start',
        },
      },
      {
        element: () =>
          firstVisible('[data-tour="chat-input"]') ?? firstVisible('[data-tour="chat-panel"]') ?? document.body,
        popover: {
          title: m.oryxel_tour_input_title(),
          description: m.oryxel_tour_input_desc(),
          side: 'top',
          align: mobile ? 'center' : 'start',
        },
      },
      {
        element: () => tourElement('[data-tour="diary-primary-tabs"]'),
        popover: {
          title: m.oryxel_tour_tabs_title(),
          description: m.oryxel_tour_tabs_desc(),
          side: 'top',
          align: mobile ? 'center' : 'start',
          onNextClick: async (_element, _step, { driver: drv }) => {
            clickTourTarget('[data-tour="primary-fragrances"]')
            await tick()
            clickTourTarget('[data-tour="fragrance-list-owned"]')
            await tick()
            await tick()
            drv.moveNext()
          },
        },
      },
      {
        element: () => tourElement('[data-tour="diary-table"]'),
        popover: {
          title: m.oryxel_tour_table_title(),
          description: m.oryxel_tour_table_desc(),
          side: 'bottom',
          align: mobile ? 'center' : 'start',
          onNextClick: async (_element, _step, { driver: drv }) => {
            await afterTabSwitchNavigate(drv, () => clickTourTarget('[data-tour="primary-profile"]'))
          },
        },
      },
      {
        element: () => firstVisible('[data-tour="profile-header"]') ?? tourElement('[data-tour="diary-primary-tabs"]'),
        onHighlighted: (_element, _step, { driver: drv }) => {
          scheduleDriverRefresh(drv)
        },
        popover: {
          title: m.oryxel_tour_profile_title(),
          description: m.oryxel_tour_profile_desc(),
          /* Mobile: bottom popover covers the card; keep tooltip above */
          side: mobile ? 'top' : 'bottom',
          align: mobile ? 'center' : 'start',
        },
      },
      {
        element: () => tourElement('[data-tour="profile-radar"]'),
        onHighlighted: (_element, _step, { driver: drv }) => {
          scheduleDriverRefresh(drv)
        },
        popover: {
          title: m.oryxel_tour_profile_radar_title(),
          description: m.oryxel_tour_profile_radar_desc(),
          side: mobile ? 'top' : 'right',
          align: mobile ? 'center' : 'start',
          onNextClick: async (_element, _step, { driver: drv }) => {
            await afterTabSwitchNavigate(drv, () => clickTourTarget('[data-tour="primary-notes"]'))
          },
        },
      },
      {
        element: () => tourElement('[data-tour="notes-view-toggle"]'),
        onHighlighted: (_element, _step, { driver: drv }) => {
          scheduleDriverRefresh(drv)
        },
        popover: {
          title: m.oryxel_tour_notes_title(),
          description: m.oryxel_tour_notes_desc(),
          side: mobile ? 'top' : 'bottom',
          align: mobile ? 'center' : 'end',
        },
      },
      {
        element: () => tourElement('[data-tour="notes-content"]'),
        onHighlighted: (_element, _step, { driver: drv }) => {
          scheduleDriverRefresh(drv)
        },
        popover: {
          title: m.oryxel_tour_notes_sentiments_title(),
          description: m.oryxel_tour_notes_sentiments_desc(),
          side: 'top',
          align: mobile ? 'center' : 'start',
          onNextClick: async (_element, _step, { driver: drv }) => {
            await afterTabSwitchNavigate(drv, () => clickTourTarget('[data-tour="primary-profile"]'))
          },
        },
      },
      {
        element: () =>
          firstVisible('[data-tour="profile-settings"]') ??
          firstVisible('[data-tour="profile-header"]') ??
          tourElement('[data-tour="diary-primary-tabs"]'),
        onHighlighted: (_element, _step, { driver: drv }) => {
          scheduleDriverRefresh(drv)
        },
        popover: {
          title: m.oryxel_tour_settings_title(),
          description: m.oryxel_tour_settings_desc(),
          side: mobile ? 'top' : 'bottom',
          align: mobile ? 'center' : 'end',
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
    ]
  }

  onMount(() => {
    if (!browser) return

    const mobile = isMobileWidth()

    const driverObject = driver({
      showProgress: true,
      progressText: m.oryxel_tour_step_of({ current: '{{current}}', total: '{{total}}' }),
      nextBtnText: m.oryxel_tour_next(),
      prevBtnText: m.oryxel_tour_back(),
      doneBtnText: m.oryxel_tour_finish(),
      allowClose: true,
      overlayOpacity: 0.62,
      smoothScroll: true,
      popoverOffset: mobile ? 16 : 10,
      stagePadding: mobile ? 8 : 10,
      popoverClass: 'oryxel-driver-popover',
      steps: buildTourSteps(mobile),
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
  /* No backdrop-filter here: driver.js uses a full-viewport SVG mask; blurring the overlay
     blurs the entire viewport in WebKit/Blink, including the highlighted “hole”. */
  :global(.driver-overlay) {
    z-index: 40 !important;
  }

  :global(.driver-active-element) {
    z-index: 41 !important;
  }

  /*
   * driver.js: `:not(body):has(> .driver-active-element){overflow:hidden}`.
   * When the highlighted node is a direct child of <phantom-ui>, that host gets overflow:hidden
   * and can clip the spotlight area; shimmer host also uses position:relative.
   */
  :global(body.driver-active phantom-ui) {
    overflow: visible !important;
  }

  :global(.driver-popover) {
    z-index: 100 !important;
    box-sizing: border-box !important;
    background-color: var(--color-surface) !important;
    color: var(--color-foreground) !important;
    border: 1px solid var(--color-border) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18) !important;
    min-width: 280px !important;
    max-width: 320px !important;
    padding: 18px !important;
  }

  @media (max-width: 767px) {
    :global(.driver-popover) {
      min-width: 0 !important;
      max-width: calc(100vw - 1rem) !important;
      max-height: min(78dvh, calc(100dvh - 5.25rem - env(safe-area-inset-top, 0px))) !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      padding: max(14px, env(safe-area-inset-top, 0px)) max(14px, env(safe-area-inset-right, 0px)) 14px
        max(14px, env(safe-area-inset-left, 0px)) !important;
      -webkit-overflow-scrolling: touch;
    }

    :global(.driver-popover-title),
    :global(.driver-popover-description) {
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    :global(.driver-popover-footer) {
      flex-wrap: wrap !important;
      align-items: center !important;
      gap: 10px !important;
      row-gap: 10px !important;
    }

    :global(.driver-popover-progress-text) {
      width: 100%;
      order: -1;
      margin-bottom: 2px;
    }

    :global(.driver-popover-navigation-btns) {
      display: flex !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
      justify-content: flex-end !important;
      gap: 8px !important;
      flex-wrap: wrap !important;
    }

    :global(.driver-popover-footer button) {
      min-height: 44px !important;
      padding: 8px 14px !important;
    }
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
