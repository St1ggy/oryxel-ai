import { structuredPreferencePatchSchema } from '../schemas'

import type { AnalyzePreferencesRequest, StructuredPreferencePatch } from '../contracts'

function languageForLocale(locale: string): string {
  if (locale.startsWith('es')) return 'Spanish'

  if (locale.startsWith('fr')) return 'French'

  if (locale.startsWith('ru')) return 'Russian'

  if (locale.startsWith('jp') || locale.startsWith('ja')) return 'Japanese'

  if (locale.startsWith('zh')) return 'Chinese'

  return 'English'
}

/* eslint-disable camelcase */
type TableNames = { to_try: string; liked: string; disliked: string; owned: string }

function tableNamesForLocale(locale: string): TableNames {
  if (locale === 'ru')
    return { to_try: 'Хочу попробовать', liked: 'Нравится', disliked: 'Не нравится', owned: 'В наличии' }

  if (locale.startsWith('es'))
    return { to_try: 'Por probar', liked: 'Me gusta', disliked: 'No me gusta', owned: 'En colección' }

  if (locale.startsWith('fr')) return { to_try: 'À essayer', liked: 'Aimé', disliked: 'Pas aimé', owned: 'Possédé' }

  if (locale.startsWith('jp') || locale.startsWith('ja'))
    return { to_try: '試したい', liked: '好き', disliked: '好きじゃない', owned: '所有' }

  if (locale.startsWith('zh')) return { to_try: '想试试', liked: '喜欢', disliked: '不喜欢', owned: '拥有' }

  return { to_try: 'To Try', liked: 'Liked', disliked: 'Disliked', owned: 'Collection' }
}
/* eslint-enable camelcase */

function buildBaseInstructions(request: AnalyzePreferencesRequest): string[] {
  const language = languageForLocale(request.locale)
  const tableNames = tableNamesForLocale(request.locale)

  return [
    "You are a helpful fragrance assistant for Oryxel. You can chat naturally, analyze preferences, and manage the user's fragrance diary.",
    'CRITICAL: Detect the language of the user message and reply in that same language. If the user writes in Russian, reply in Russian. If in Spanish, reply in Spanish. If in French, reply in French. Etc. Only fall back to the UI locale language if you cannot detect the user message language.',
    'Return ONLY compact JSON — no markdown, no code fences, no extra text outside the JSON object.',
    'Required JSON keys: reply (string), confidence (0-1), summary (string), tableOps (array, may be empty).',
    'Optional JSON keys: profile (object), recommendations (array), suggestions (array).',
    'The "reply" field: your conversational response to the user. Always set it when the user asked a question, gave a command, or expects a confirmation.',
    'The "summary" field: a 1-2 sentence human-readable description of what changed (used in UI notifications). Write in the user message language.',
    'Table operations — op values: add, move, rate, status, remove.',
    'listType values: to_try (not tried yet), liked (tried + liked), disliked (tried + disliked), owned (user owns it).',
    'A fragrance can appear in multiple lists simultaneously: e.g., owned=true AND liked=true is valid.',
    'For op=add: set brandName and fragranceName (strings). Do NOT use fragranceId for new fragrances.',
    `For op=add: set notesSummary to a comma-separated list of up to 5 fragrance notes (in English, standard perfumery terms).`,
    `For op=add or op=status: you MAY set pyramidTop, pyramidMid, pyramidBase as comma-separated note lists in English (e.g. "bergamot, lemon" / "rose, jasmine, iris" / "sandalwood, musk, amber"). Only set if you know them.`,
    'For op=move/rate/status/remove: set rowId to the id from the diary context. Never use op=add for rows that already exist in the diary.',
    `UI locale is ${language}. Diary list names in this locale: to_try="${tableNames.to_try}", liked="${tableNames.liked}", disliked="${tableNames.disliked}", owned="${tableNames.owned}". Use these names when referring to lists in your reply.`,
    `IMPORTANT: profile.archetype, profile.favoriteNote, recommendations[].tag must be locale maps with ALL 6 keys: { "en": "...", "es": "...", "fr": "...", "jp": "...", "ru": "...", "zh": "..." }.`,
    `IMPORTANT: profile.radarLabels must be keyed by AXIS KEY (not locale). Format: { "woody": { "en": "Woody", "es": "Leñoso", "fr": "Boisé", "jp": "ウッディ", "ru": "Древесный", "zh": "木质" } }. WRONG: { "en": { ... } }.`,
    `recommendations[].tag: 2-3 characteristic notes translated into all 6 locales as a locale map.`,
    'suggestions: array of up to 3 short chat prompt ideas as locale maps with all 6 keys. Omit if context has not changed significantly.',
    `LOCALE CODES used: en=English, es=Spanish, fr=French, jp=Japanese, ru=Russian, zh=Chinese. Always populate all 6 when filling locale maps.`,
  ]
}

type DiaryContextEntry = {
  id: number
  brand: string
  fragrance: string
  pyramidTop?: string | null
  pyramidMid?: string | null
  pyramidBase?: string | null
}

function formatDiaryList(entries: DiaryContextEntry[]): string {
  if (entries.length === 0) return '[]'

  return entries
    .map((entry) => {
      const pyramid =
        entry.pyramidTop || entry.pyramidMid || entry.pyramidBase
          ? `,top:"${entry.pyramidTop ?? ''}",mid:"${entry.pyramidMid ?? ''}",base:"${entry.pyramidBase ?? ''}"`
          : ''

      return `{id:${entry.id},brand:"${entry.brand}",frag:"${entry.fragrance}"${pyramid}}`
    })
    .join(', ')
}

function buildContextBlock(request: AnalyzePreferencesRequest): string[] {
  const context = request.context

  if (!context) {
    return ['Context: not provided.']
  }

  const lines = [
    'Context:',
    `- profile: ${JSON.stringify(context.profile ?? {})}`,
    `- budget: ${context.budget ?? 'not provided'}`,
  ]

  const diary = context.diary

  if (diary) {
    lines.push(
      'Diary (use id as rowId for move/rate/status/remove ops; pyramidTop/Mid/Base show current pyramid if known):',
      `- owned: ${formatDiaryList((diary.owned ?? []) as DiaryContextEntry[])}`,
      `- to_try: ${formatDiaryList((diary.to_try ?? []) as DiaryContextEntry[])}`,
      `- liked: ${formatDiaryList((diary.liked ?? []) as DiaryContextEntry[])}`,
      `- disliked: ${formatDiaryList((diary.disliked ?? []) as DiaryContextEntry[])}`,
    )
  }

  if (context.recentMessages && context.recentMessages.length > 0) {
    lines.push('Recent conversation:')

    for (const message of context.recentMessages) {
      lines.push(`- ${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
    }
  }

  return lines
}

function buildScenarioBlock(request: AnalyzePreferencesRequest): string[] {
  const scenario = request.scenario
  const language = languageForLocale(request.locale)
  const scenarioInstructions: Record<AnalyzePreferencesRequest['scenario'], string> = {
    analog:
      'Scenario analog: find the closest scent analogs for a fragrance the user mentions. Suggest up to 5 alternatives as tableOps (op=add, listType=to_try) with notesSummary. Set pyramidTop/Mid/Base for each if you know them. Write a friendly reply explaining your picks and the scent similarities.',
    pyramid: [
      'Scenario pyramid: the user wants to know or update the olfactory pyramid (top/mid/base notes) of one or more fragrances.',
      'For each relevant fragrance already in the diary, generate a tableOp with op=status and rowId, setting pyramidTop, pyramidMid, pyramidBase as comma-separated English note names.',
      'If the fragrance is not yet in the diary, use op=add with brandName, fragranceName, listType=to_try, and fill pyramidTop/Mid/Base.',
      'IMPORTANT: Always populate ALL THREE pyramid fields (pyramidTop, pyramidMid, pyramidBase) — never leave any empty unless the fragrance genuinely has no notes in that tier.',
      'Also update profile.favoriteNote and profile.rationale if the analysis reveals strong note preferences.',
      'Include a reply describing the pyramid in a natural, conversational way.',
    ].join(' '),
    recommendation:
      'Scenario recommendation: suggest fragrances the user would likely enjoy based on their diary and preferences. Set recommendations (up to 10 items, each with pyramidTop/Mid/Base if known). Update suggestions to 3 relevant follow-up prompts. Include a helpful reply presenting your picks.',
    comparison:
      'Scenario comparison: compare two or more fragrances mentioned by the user. Highlight differences in notes, character, and suitability. Update ratings or move rows if the user indicates clear preference. Include a reply summarizing the comparison.',
    command: [
      'Scenario command: the user gave a direct instruction. Execute it precisely with tableOps.',
      'If adding a fragrance: use op=add, set brandName, fragranceName, listType, notesSummary, and pyramidTop/Mid/Base if you know them.',
      'If rating: op=rate with rowId and rating (0-5).',
      'If moving between lists: op=move with rowId and new listType.',
      'If updating status label: op=status with rowId and statusLabel.',
      'If removing: op=remove with rowId.',
      'If updating pyramid notes: op=status with rowId, set pyramidTop, pyramidMid, pyramidBase.',
      'Set tableOps:[] only if the message is a pure question with no action requested.',
      'Always include a reply confirming what you did, or answering the question.',
    ].join(' '),
    // eslint-disable-next-line camelcase
    profile_sync: [
      'Scenario profile_sync: fully analyze the diary to update the user profile and recommendations.',
      'Base ALL profile calculations ONLY on "owned", "liked", and "disliked" entries — ignore "to_try".',
      'profile.archetype: locale map, 2-5 word phrase describing their scent personality in all 6 locales.',
      'profile.favoriteNote: locale map with the single most prominent note across liked/owned entries.',
      'profile.radar: 4-7 lowercase English axis keys (e.g. "oud", "floral", "citrus", "woody"), integer values 0-100.',
      'profile.radarLabels: nested locale map { axisKey: { "en": "...", "es": "...", "fr": "...", "jp": "...", "ru": "...", "zh": "..." } }.',
      `profile.rationale: brief explanation in ${language}.`,
      'recommendations: 10-12 fragrances the user would likely enjoy but does not have. Each must include id (unique string), brand, name, tag (locale map, 2-3 notes in all 6 locales).',
      'suggestions: exactly 3 follow-up chat prompt ideas as locale maps (all 6 keys). Examples: analog request, note exploration, seasonal pick.',
      'tableOps: set only if fragrances clearly need re-rating or moving based on diary patterns.',
      'If owned/liked/disliked are all empty: set recommendations=[] and suggestions=[].',
      `Include a brief reply in ${language}.`,
    ].join(' '),
  }

  return [`Scenario: ${scenario}`, scenarioInstructions[scenario]]
}

export function buildPrompt(request: AnalyzePreferencesRequest): string {
  return [
    ...buildBaseInstructions(request),
    ...buildContextBlock(request),
    ...buildScenarioBlock(request),
    `User message: ${request.message}`,
  ].join('\n')
}

export function parseStructuredPatch(raw: unknown): StructuredPreferencePatch {
  let payload: unknown = raw

  if (typeof raw === 'string') {
    payload = JSON.parse(raw)
  } else if (raw && typeof raw === 'object' && 'output_text' in raw) {
    payload = JSON.parse(String((raw as { output_text: string }).output_text))
  }

  return structuredPreferencePatchSchema.parse(payload)
}
