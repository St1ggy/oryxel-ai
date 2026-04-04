import { error, json } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { applyProfileAndSuggestions, applyRecommendations, applySingleTableOp } from '$lib/server/ai/apply'
import { isCriticalPatch } from '$lib/server/ai/decision'
import { completeJob, createJob, failJob, pushJobProgress } from '$lib/server/ai/jobs'
import { getUserDefaultProvider } from '$lib/server/ai/keys/service'
import { analyzePreferences } from '$lib/server/ai/router'
import {
  appendPatchAuditLog,
  createChatMessage,
  createPendingPatch,
  loadRecentChatMessages,
  updatePatchStatus,
} from '$lib/server/ai/storage'
import { db } from '$lib/server/db'
import { userAiPreferences } from '$lib/server/db/schema'
import { recordActivity } from '$lib/server/diary/activity'
import { loadDiaryForUser } from '$lib/server/diary/load'
import { loadProfileForUser } from '$lib/server/profile/load'
import { generateMissingTranslations } from '$lib/server/translation/generate'

import type { StructuredPreferencePatch } from '$lib/server/ai/contracts'
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

type ParsedBody = z.infer<typeof bodySchema>

function inferScenarioFromMessage(message: string): 'analog' | 'pyramid' | 'recommendation' | 'comparison' | 'command' {
  const normalized = message.toLowerCase()

  if (message.includes('\n')) {
    const hasMarkdownHeader = /^#\s/m.test(message)
    const bulkMarkers = [
      'в наличии',
      'нравится',
      'не нравится',
      'хочу попробовать',
      'приоритет на тест',
      'профиль предпочтений',
      'owned:',
      'liked:',
      'disliked:',
    ]
    const hasSectionMarker = bulkMarkers.some((marker) => normalized.includes(marker))

    if (hasMarkdownHeader || hasSectionMarker) return 'command'
  }

  const commandKeywords = [
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
    'add',
    'remove',
    'delete',
    'move',
    'put',
    'rate',
    'update',
    'set',
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
    'füge',
    'hinzufügen',
    'lösche',
    'löschen',
    'bewege',
    'bewerten',
    'aktualisiere',
    'adiciona',
    'adicionar',
    'avalia',
    'avaliar',
    'atualiza',
    'aggiungi',
    'rimuovi',
    'sposta',
    'valuta',
    'aggiorna',
    '추가',
    '삭제',
    '이동',
    '평가',
    '업데이트',
    'أضف',
    'احذف',
    'انقل',
    'قيّم',
    'حدّث',
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

  const pyramidKeywords = [
    'пирамида',
    'пирамиду',
    'пирамиды',
    'ноты',
    'pyramid',
    'pyramide',
    'pirámide',
    'piramide',
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

  const comparisonKeywords = [
    'сравн',
    'compare',
    'versus',
    'vs ',
    'comparar',
    'comparer',
    'vergleich',
    'сравнить',
    'confronta',
    '比較',
    '비교',
    'مقارنة',
  ]

  if (comparisonKeywords.some((kw) => normalized.includes(kw))) return 'comparison'

  return 'recommendation'
}

async function applyPatchWithProgress(
  jobId: number,
  userId: string,
  patch: StructuredPreferencePatch,
  baseStep: number,
  total: number,
): Promise<boolean> {
  const profileStep = patch.profile != null || patch.suggestions != null ? 1 : 0
  const recStep = patch.recommendations == null ? 0 : 1
  let step = baseStep

  try {
    if (profileStep) {
      await pushJobProgress(jobId, { step: ++step, total, phase: 'applying' })
      await applyProfileAndSuggestions(userId, patch)
    }

    if (recStep) {
      await pushJobProgress(jobId, { step: ++step, total, phase: 'applying' })
      await applyRecommendations(userId, patch)
    }

    for (const op of patch.tableOps) {
      await pushJobProgress(jobId, { step: ++step, total, phase: 'applying' })
      await applySingleTableOp(userId, op)
    }

    return true
  } catch {
    return false
  }
}

async function runAgentChat(
  jobId: number,
  userId: string,
  userName: string,
  body: ParsedBody,
  locale: string,
  scenario: ReturnType<typeof inferScenarioFromMessage>,
): Promise<void> {
  try {
    await pushJobProgress(jobId, { step: 0, total: 1, phase: 'analyzing' })

    const [profile, diary, defaultProvider, recentMessages, aiPrefs] = await Promise.all([
      loadProfileForUser(userId, userName),
      loadDiaryForUser(userId, locale),
      getUserDefaultProvider(userId),
      loadRecentChatMessages(userId, 6),
      db
        .select({
          minRecommendations: userAiPreferences.minRecommendations,
          maxRecommendations: userAiPreferences.maxRecommendations,
          maxPyramidNotes: userAiPreferences.maxPyramidNotes,
          tone: userAiPreferences.tone,
          depth: userAiPreferences.depth,
          rememberContext: userAiPreferences.rememberContext,
        })
        .from(userAiPreferences)
        .where(eq(userAiPreferences.userId, userId))
        .limit(1)
        .then((rows) => rows[0]),
    ])

    type DiaryEntry = (typeof diary.to_try)[number]

    const toContextEntry = ({ id, brand, fragrance, notes, pyramidTop, pyramidMid, pyramidBase }: DiaryEntry) => ({
      id,
      brand,
      fragrance,
      notes: notes.join(', ') || null,
      pyramidTop,
      pyramidMid,
      pyramidBase,
    })

    const context = {
      profile: {
        displayName: profile.displayName,
        bio: profile.bio,
        preferences: profile.preferences || undefined,
        archetype: profile.archetype ?? undefined,
        favoriteNote: profile.favoriteNote ?? undefined,
        radar: Object.fromEntries(profile.radarAxes.map(({ key, value }) => [key, value])),
        gender: (profile.gender as 'male' | 'female' | null | undefined) ?? undefined,
        noteRelationships: profile.noteRelationships.length > 0 ? profile.noteRelationships : undefined,
      },
      diary: {
        // eslint-disable-next-line camelcase
        to_try: diary.to_try.map((entry) => toContextEntry(entry)),
        liked: diary.liked.map((entry) => toContextEntry(entry)),
        neutral: diary.neutral.map((entry) => toContextEntry(entry)),
        disliked: diary.disliked.map((entry) => toContextEntry(entry)),
        owned: diary.owned.map((entry) => toContextEntry(entry)),
      },
      budget: body.context?.budget,
      recentMessages: (aiPrefs?.rememberContext ?? true) ? recentMessages : undefined,
    }

    const router = await analyzePreferences({
      userId,
      message: body.message,
      locale,
      scenario,
      context,
      preferredProvider: body.provider ?? defaultProvider ?? undefined,
      minRecommendations: aiPrefs?.minRecommendations,
      maxRecommendations: aiPrefs?.maxRecommendations,
      maxPyramidNotes: aiPrefs?.maxPyramidNotes,
      tone: aiPrefs?.tone ?? undefined,
      depth: aiPrefs?.depth ?? undefined,
    })

    const patch = router.result.patch
    const critical = isCriticalPatch(patch)
    const pendingPatch = await createPendingPatch({
      userId,
      patch,
      patchType: critical ? 'critical' : 'minor',
      attempts: router.attempts as unknown as Record<string, unknown>[],
    })

    const profileStep = patch.profile != null || patch.suggestions != null ? 1 : 0
    const recStep = patch.recommendations == null ? 0 : 1
    const applyTotal = profileStep + recStep + patch.tableOps.length

    if (!critical) {
      const ok = await applyPatchWithProgress(jobId, userId, patch, 0, applyTotal)

      if (!ok) {
        await updatePatchStatus({
          patchId: pendingPatch.id,
          userId,
          action: 'failed',
          failureReason: 'Patch apply failed',
        })
        await appendPatchAuditLog({
          userId,
          patchId: pendingPatch.id,
          action: 'apply_failed',
          details: { attempts: router.attempts },
        })
        await failJob(jobId, 'Patch apply failed')

        return
      }

      void generateMissingTranslations(userId, locale)
      await updatePatchStatus({ patchId: pendingPatch.id, userId, action: 'applied' })
      void recordActivity({
        userId,
        action: 'patch_applied',
        actor: 'agent',
        provider: body.provider ?? defaultProvider ?? undefined,
        summary: patch.summary ?? '',
      })
    }

    const assistantMessage =
      patch.reply ?? (critical ? `CRITICAL_PENDING:${patch.summary}` : `PATCH_APPLIED:${patch.summary}`)

    await createChatMessage({ userId, role: 'assistant', content: assistantMessage, locale, scenario })

    const triggerSync =
      !critical && (patch.tableOps.length >= 2 || patch.recommendations != null || scenario === 'command')

    await completeJob(jobId, {
      requiresConfirmation: critical,
      pendingPatchId: pendingPatch.id,
      summary: patch.summary,
      reply: patch.reply,
      triggerSync,
    })
  } catch (error_) {
    await failJob(jobId, error_ instanceof Error ? error_.message : 'Unknown error')
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = bodySchema.parse(await request.json())
  const locale = body.locale ?? 'en'
  const scenario = body.scenario ?? inferScenarioFromMessage(body.message)
  const userId = locals.user.id
  const userName = locals.user.name || 'User'

  await createChatMessage({ userId, role: 'user', content: body.message, locale, scenario })

  const jobId = await createJob(userId, 'agent_chat')

  // Fire-and-forget: Vercel serverless keeps the event loop alive after response
  void runAgentChat(jobId, userId, userName, body, locale, scenario)

  return json({ jobId })
}
