import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { applyPatchToDatabase } from '$lib/server/ai/apply'
import { isCriticalPatch } from '$lib/server/ai/decision'
import { getUserDefaultProvider } from '$lib/server/ai/keys/service'
import { analyzePreferences } from '$lib/server/ai/router'
import {
  appendPatchAuditLog,
  createChatMessage,
  createPendingPatch,
  loadRecentChatMessages,
  updatePatchStatus,
} from '$lib/server/ai/storage'
import { loadDiaryForUser } from '$lib/server/diary/load'
import { loadProfileForUser } from '$lib/server/profile/load'

import type { RequestHandler } from './$types'

const bodySchema = z.object({
  message: z.string().min(1),
  locale: z.string().min(2).max(10).optional(),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'qwen', 'perplexity', 'groq', 'deepseek']).optional(),
  scenario: z.enum(['analog', 'pyramid', 'recommendation', 'comparison', 'command']).optional(),
  context: z
    .object({
      budget: z.string().max(120).optional(),
    })
    .optional(),
})

function inferScenarioFromMessage(message: string): 'analog' | 'pyramid' | 'recommendation' | 'comparison' | 'command' {
  const normalized = message.toLowerCase()

  // Command keywords: RU / EN / ES / FR / JA / ZH / DE / PT / IT / KO / AR
  const commandKeywords = [
    // Russian
    'добавь',
    'добавить',
    'удали',
    'удалить',
    'убери',
    'убрать',
    'перемести',
    'переместить',
    'перенеси',
    'перенести',
    'поставь',
    'поставить',
    'оцени',
    'оценить',
    'измени',
    'изменить',
    'обнови',
    // English
    'add',
    'remove',
    'delete',
    'move',
    'put',
    'rate',
    'update',
    'set',
    // Spanish
    'añade',
    'añadir',
    'agrega',
    'agregar',
    'quita',
    'quitar',
    'elimina',
    'eliminar',
    'mueve',
    'mover',
    'valora',
    'valorar',
    'actualiza',
    'actualizar',
    'pon',
    'poner',
    // French
    'ajoute',
    'ajouter',
    'supprime',
    'supprimer',
    'déplace',
    'déplacer',
    'note',
    'noter',
    'mets',
    'mettre',
    'modifie',
    'modifier',
    'mets à jour',
    // German
    'füge',
    'hinzufügen',
    'lösche',
    'löschen',
    'bewege',
    'bewerten',
    'aktualisiere',
    // Portuguese
    'adiciona',
    'adicionar',
    'remove',
    'remover',
    'move',
    'mover',
    'avalia',
    'avaliar',
    'atualiza',
    // Italian
    'aggiungi',
    'rimuovi',
    'sposta',
    'valuta',
    'aggiorna',
    // Korean
    '추가',
    '삭제',
    '이동',
    '평가',
    '업데이트',
    // Arabic
    'أضف',
    'احذف',
    'انقل',
    'قيّم',
    'حدّث',
    // Japanese / Chinese handled below as word fragments
    '追加',
    '削除',
    '移動',
    '評価',
    '更新',
    '添加',
    '删除',
    '移动',
    '评分',
  ]

  if (commandKeywords.some((kw) => normalized.includes(kw))) return 'command'

  // Analog keywords
  const analogKeywords = [
    'аналог',
    'analog',
    'similar',
    'analogue',
    'похожий',
    'похожее',
    'похожую',
    'similaire',
    'similar a',
    'simile a',
    'ähnlich',
    'parecido',
    '似た',
    '类似',
  ]

  if (analogKeywords.some((kw) => normalized.includes(kw))) return 'analog'

  // Pyramid keywords
  const pyramidKeywords = [
    'пирамида',
    'пирамиду',
    'пирамиды',
    'ноты',
    'pyramid',
    'pyramide',
    'pirámide',
    'piramide',
    'pyramide',
    'ピラミッド',
    '香调金字塔',
    '피라미드',
    'top note',
    'middle note',
    'base note',
    'head note',
    'heart note',
    'верхние ноты',
    'средние ноты',
    'базовые ноты',
  ]

  if (pyramidKeywords.some((kw) => normalized.includes(kw))) return 'pyramid'

  // Comparison keywords
  const comparisonKeywords = [
    'сравн',
    'compare',
    'versus',
    'vs ',
    'comparar',
    'comparer',
    'vergleich',
    'сравнить',
    'comparar',
    'confronta',
    '比較',
    '비교',
    'مقارنة',
  ]

  if (comparisonKeywords.some((kw) => normalized.includes(kw))) return 'comparison'

  return 'recommendation'
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = bodySchema.parse(await request.json())
  const locale = body.locale ?? 'en'
  const scenario = body.scenario ?? inferScenarioFromMessage(body.message)

  await createChatMessage({
    userId: locals.user.id,
    role: 'user',
    content: body.message,
    locale,
    scenario,
  })

  const [profile, diary, defaultProvider, recentMessages] = await Promise.all([
    loadProfileForUser(locals.user.id, locals.user.name || 'User'),
    loadDiaryForUser(locals.user.id, locale),
    getUserDefaultProvider(locals.user.id),
    loadRecentChatMessages(locals.user.id, 6),
  ])

  const context = {
    profile: {
      displayName: profile.displayName,
      bio: profile.bio,
      archetype: profile.archetype ?? undefined,
      favoriteNote: profile.favoriteNote ?? undefined,
      radar: Object.fromEntries(profile.radarAxes.map(({ key, value }) => [key, value])),
    },
    diary: {
      // eslint-disable-next-line camelcase
      to_try: diary.to_try.map(({ id, brand, fragrance, pyramidTop, pyramidMid, pyramidBase }) => ({
        id,
        brand,
        fragrance,
        pyramidTop,
        pyramidMid,
        pyramidBase,
      })),
      liked: diary.liked.map(({ id, brand, fragrance, pyramidTop, pyramidMid, pyramidBase }) => ({
        id,
        brand,
        fragrance,
        pyramidTop,
        pyramidMid,
        pyramidBase,
      })),
      disliked: diary.disliked.map(({ id, brand, fragrance, pyramidTop, pyramidMid, pyramidBase }) => ({
        id,
        brand,
        fragrance,
        pyramidTop,
        pyramidMid,
        pyramidBase,
      })),
      owned: diary.owned.map(({ id, brand, fragrance, pyramidTop, pyramidMid, pyramidBase }) => ({
        id,
        brand,
        fragrance,
        pyramidTop,
        pyramidMid,
        pyramidBase,
      })),
    },
    budget: body.context?.budget,
    recentMessages,
  }

  const router = await analyzePreferences({
    userId: locals.user.id,
    message: body.message,
    locale,
    scenario,
    context,
    preferredProvider: body.provider ?? defaultProvider ?? undefined,
  })

  const patch = router.result.patch
  const critical = isCriticalPatch(patch)
  const pendingPatch = await createPendingPatch({
    userId: locals.user.id,
    patch,
    patchType: critical ? 'critical' : 'minor',
    attempts: router.attempts as unknown as Record<string, unknown>[],
  })

  if (!critical) {
    try {
      await applyPatchToDatabase(locals.user.id, patch)
      await updatePatchStatus({
        patchId: pendingPatch.id,
        userId: locals.user.id,
        action: 'applied',
      })
    } catch (error_) {
      await updatePatchStatus({
        patchId: pendingPatch.id,
        userId: locals.user.id,
        action: 'failed',
        failureReason: error_ instanceof Error ? error_.message : 'Patch apply failed',
      })
      await appendPatchAuditLog({
        userId: locals.user.id,
        patchId: pendingPatch.id,
        action: 'apply_failed',
        details: {
          attempts: router.attempts,
        },
      })

      throw error(500, 'PATCH_APPLY_FAILED')
    }
  }

  const assistantMessage =
    patch.reply ?? (critical ? `CRITICAL_PENDING:${patch.summary}` : `PATCH_APPLIED:${patch.summary}`)

  await createChatMessage({
    userId: locals.user.id,
    role: 'assistant',
    content: assistantMessage,
    locale,
    scenario,
  })

  return json({
    ok: true,
    requiresConfirmation: critical,
    pendingPatchId: pendingPatch.id,
    summary: patch.summary,
    reply: patch.reply,
    attempts: router.attempts,
  })
}
