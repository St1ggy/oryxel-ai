import type { ChatAgentMode, ModeSwitchReasonKey, ModeSwitchSuggestion } from '../types/chat-mode.js'

const AGENT_KEYWORDS = [
  'удали',
  'удалить',
  'убери',
  'убрать',
  'перемести',
  'переместить',
  'перенеси',
  'перенести',
  'оцени',
  'оценить',
  'измени',
  'изменить',
  'обнови',
  'обновить',
  'remove',
  'delete',
  'move',
  'rate',
  'update',
  'set',
  'elimina',
  'quita',
  'mueve',
  'valora',
  'supprime',
  'déplace',
  'évalue',
  'profil',
  'profile',
  'профиль',
]

const ADD_KEYWORDS = [
  'добавь',
  'добавить',
  'запиши',
  'записать',
  'положи',
  'положить',
  'внеси',
  'внести',
  'add',
  'añade',
  'añadir',
  'agrega',
  'agregar',
  'ajoute',
  'ajouter',
  'hinzufügen',
  '追加',
  '添加',
]

const CURATE_KEYWORDS = [
  'коллекц',
  'список',
  'подборк',
  'собери',
  'собрать',
  'collection',
  'curate',
  'list of',
  'make a list',
  'colección',
  'liste',
  'リスト',
  '清单',
]

const RECOMMEND_KEYWORDS = [
  'порекомендуй',
  'порекомендовать',
  'подбери',
  'подобрать',
  'рекомендуй',
  'рекомендовать',
  'что попробовать',
  'что надеть',
  'recommend',
  'suggest',
  'suggestion',
  'recomienda',
  'recomendar',
  'sugiere',
  'recommande',
  'recommander',
  'empfehl',
  'おすすめ',
  '推荐',
]

const ASK_KEYWORDS = [
  'что такое',
  'что значит',
  'объясни',
  'объяснить',
  'расскажи',
  'рассказать',
  'чем отличается',
  'в чём разница',
  'какой',
  'какая',
  'какие',
  'как ',
  'почему',
  'зачем',
  'what is',
  'what are',
  'explain',
  'tell me',
  'how does',
  'why ',
  'difference between',
  'qué es',
  "qu'est-ce",
  'explique',
  'pourquoi',
  'comment ',
  'とは',
  '什么是',
]

const BULK_MARKERS = [
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

function normalize(message: string) {
  return message.toLowerCase().trim()
}

function hasKeyword(normalized: string, keywords: readonly string[]) {
  return keywords.some((keyword) => normalized.includes(keyword))
}

function isBulkImport(message: string, normalized: string) {
  if (!message.includes('\n')) {
    return false
  }

  const hasMarkdownHeader = /^#\s/m.test(message)

  return hasMarkdownHeader || BULK_MARKERS.some((marker) => normalized.includes(marker))
}

function isQuestionIntent(normalized: string) {
  if (normalized.endsWith('?')) {
    return true
  }

  return hasKeyword(normalized, ASK_KEYWORDS)
}

function countIntentSignals(message: string, normalized: string) {
  const agent = hasKeyword(normalized, AGENT_KEYWORDS) || isBulkImport(message, normalized)
  const add = hasKeyword(normalized, ADD_KEYWORDS)
  const recommend = hasKeyword(normalized, RECOMMEND_KEYWORDS)
  const curate = hasKeyword(normalized, CURATE_KEYWORDS)
  const ask = isQuestionIntent(normalized) && !agent && !add && !recommend && !curate

  return { agent, add, recommend, ask, curate }
}

function reasonForMode(mode: ChatAgentMode) {
  switch (mode) {
    case 'ask': {
      return 'ask_intent' satisfies ModeSwitchReasonKey
    }

    case 'add': {
      return 'add_intent' satisfies ModeSwitchReasonKey
    }

    case 'recommend': {
      return 'recommend_intent' satisfies ModeSwitchReasonKey
    }

    case 'agent': {
      return 'agent_intent' satisfies ModeSwitchReasonKey
    }

    case 'curate': {
      return 'curate_intent' satisfies ModeSwitchReasonKey
    }
  }
}

export function inferSuggestedChatMode(message: string) {
  const normalized = normalize(message)

  if (normalized.length < 4) {
    return null
  }

  const signals = countIntentSignals(message, normalized)
  const active = (['agent', 'add', 'recommend', 'ask', 'curate'] as const).filter((key) => signals[key])

  if (active.length !== 1) {
    if (signals.agent) return 'agent'

    if (signals.add && !signals.agent) return 'add'

    if (signals.curate && !signals.agent) return 'curate'

    if (signals.recommend && !signals.agent) return 'recommend'

    if (signals.ask) return 'ask'

    return null
  }

  return active[0]!
}

export function shouldSuggestModeSwitch(
  message: string,
  currentMode: ChatAgentMode,
  dismissedTexts?: ReadonlySet<string>,
) {
  const trimmed = message.trim()

  if (trimmed.length < 4) {
    return null
  }

  if (dismissedTexts?.has(trimmed)) {
    return null
  }

  const suggested = inferSuggestedChatMode(trimmed)

  if (!suggested || suggested === currentMode) {
    return null
  }

  return {
    suggested,
    reasonKey: reasonForMode(suggested),
  } satisfies ModeSwitchSuggestion
}
