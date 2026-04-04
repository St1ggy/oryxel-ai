import { error, json } from '@sveltejs/kit'
import { z } from 'zod'

import { createJob } from '$lib/server/ai/jobs'
import { createChatMessage } from '$lib/server/ai/storage'

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

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, 'AUTH_REQUIRED')
  }

  const body = bodySchema.parse(await request.json())
  const locale = body.locale ?? 'en'
  const scenario = body.scenario ?? inferScenarioFromMessage(body.message)
  const userId = locals.user.id

  await createChatMessage({ userId, role: 'user', content: body.message, locale, scenario })

  const jobId = await createJob(userId, 'agent_chat', {
    message: body.message,
    locale,
    scenario,
    provider: body.provider ?? undefined,
    budget: body.context?.budget ?? undefined,
  })

  return json({ jobId })
}
