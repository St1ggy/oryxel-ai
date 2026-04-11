import { toast } from 'svelte-sonner'

import * as m from '$lib/paraglide/messages.js'

export function showPatchAppliedToast(options: {
  summary: string
  payload: Record<string, unknown>
  onViewDetails: (payload: Record<string, unknown>, summary: string) => void
}): void {
  const { summary, payload, onViewDetails } = options

  const toastId = toast.success(m.oryxel_patch_applied_notice(), {
    description: summary,
    duration: Number.POSITIVE_INFINITY,
    action: {
      label: m.oryxel_patch_toast_view_details(),
      onClick: () => {
        onViewDetails(payload, summary)
        toast.dismiss(toastId)
      },
    },
    cancel: {
      label: m.oryxel_patch_toast_dismiss(),
      onClick: () => {
        toast.dismiss(toastId)
      },
    },
  })
}
