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
type TableNames = { to_try: string; liked: string; neutral: string; disliked: string; owned: string }

function tableNamesForLocale(locale: string): TableNames {
  if (locale === 'ru')
    return {
      to_try: 'Хочу попробовать',
      liked: 'Нравится',
      neutral: 'Нейтральные',
      disliked: 'Не нравится',
      owned: 'В наличии',
    }

  if (locale.startsWith('es'))
    return {
      to_try: 'Por probar',
      liked: 'Me gusta',
      neutral: 'Neutro',
      disliked: 'No me gusta',
      owned: 'En colección',
    }

  if (locale.startsWith('fr'))
    return { to_try: 'À essayer', liked: 'Aimé', neutral: 'Neutre', disliked: 'Pas aimé', owned: 'Possédé' }

  if (locale.startsWith('jp') || locale.startsWith('ja'))
    return { to_try: '試したい', liked: '好き', neutral: 'ニュートラル', disliked: '好きじゃない', owned: '所有' }

  if (locale.startsWith('zh'))
    return { to_try: '想试试', liked: '喜欢', neutral: '普通', disliked: '不喜欢', owned: '拥有' }

  return { to_try: 'To Try', liked: 'Liked', neutral: 'Neutral', disliked: 'Disliked', owned: 'Collection' }
}
/* eslint-enable camelcase */

function buildBaseInstructions(request: AnalyzePreferencesRequest): string[] {
  const language = languageForLocale(request.locale)
  const tableNames = tableNamesForLocale(request.locale)

  return [
    "You are a helpful fragrance assistant for Oryxel. You can chat naturally, analyze preferences, and manage the user's fragrance diary.",
    `The 'reply' and 'summary' fields MUST be written in ${language} for the user.`,
    `notesSummary, pyramidTop, pyramidMid, pyramidBase MUST be plain English, all lowercase (e.g. "bergamot, lavender, musk"). Profile fields archetype and favoriteNote MUST be written in ${language}.`,
    `agentComment and recommendations[].tag MUST be written in ${language} — they are shown directly to the user without translation.`,
    'Return ONLY compact JSON — no markdown, no code fences, no extra text outside the JSON object.',
    'Required JSON keys: reply (string), confidence (0-1), summary (string), tableOps (array, may be empty).',
    'Optional JSON keys: profile (object), recommendations (array), suggestions (array).',
    'The "reply" field: your conversational response to the user.',
    'The "summary" field: a 1-2 sentence human-readable description of what changed.',
    'Table operations — op values: add, move, rate, status, remove.',
    'Fragrance state is stored as flags: isOwned (bool), isTried (bool), isLiked (bool|null).',
    'Flag combinations: not tried yet → isTried=false, isLiked=null, isOwned=false; liked → isTried=true, isLiked=true; disliked → isTried=true, isLiked=false; neutral (tried, no strong opinion) → isTried=true, isLiked=null, isOwned=false; in collection → isOwned=true (can combine with liked/disliked).',
    `UI list names: to_try="${tableNames.to_try}" (isTried=false, isOwned=false), liked="${tableNames.liked}" (isTried=true, isLiked=true), neutral="${tableNames.neutral}" (isTried=true, isLiked=null, isOwned=false), disliked="${tableNames.disliked}" (isTried=true, isLiked=false), owned="${tableNames.owned}" (isOwned=true). Use these names in your reply.`,
    'For op=add: set brandName and fragranceName (strings). Set isOwned/isTried/isLiked flags. Do NOT use fragranceId for new fragrances.',
    'For op=add: ALWAYS set notesSummary — comma-separated list of up to 5 key fragrance notes in English.',
    `For op=add or op=status: set pyramidTop, pyramidMid, pyramidBase as comma-separated note names in English. Fill all three tiers if you know the fragrance. Each tier must contain at most ${request.maxPyramidNotes ?? 5} notes.`,
    `For op=add or op=status: ALWAYS set agentComment — a punchy one-line phrase in ${language}, max 80 chars. Capture the scent essence (e.g. "Warm amber with smoky oud"). No sentences, no "because", no user references.`,
    `For op=add or op=status: you MAY set userComment — the user's own words about this fragrance in their language. Only set when the user explicitly shared an opinion. Max 200 chars.`,
    'For op=add or op=status: OPTIONALLY set season — comma-separated applicable seasons from: spring, summer, autumn, winter. E.g. "summer" for fresh aquatics, "autumn,winter" for heavy orientals, "spring,summer" for florals. Omit if unclear.',
    'For op=add or op=status: OPTIONALLY set timeOfDay — comma-separated from: day, evening, night. E.g. "evening,night" for intense/heavy fragrances, "day" for light/fresh ones. Omit if unclear.',
    'For op=add or op=status: OPTIONALLY set gender — one of: female, male, unisex. Base on fragrance character and notes, not just marketing. Unisex when it genuinely works for all.',
    'For op=move: set rowId and the new flag values (isOwned/isTried/isLiked).',
    'For op=rate/status/remove: set rowId to the id from the diary context. Never use op=add for rows that already exist in the diary.',
    `OUTPUT SIZE: For bulk imports (many fragrances), omit suggestions.`,
  ]
}

type DiaryContextEntry = {
  id: number
  brand: string
  fragrance: string
  notes?: string | null
  pyramidTop?: string | null
  pyramidMid?: string | null
  pyramidBase?: string | null
}

function formatDiaryList(entries: DiaryContextEntry[]): string {
  if (entries.length === 0) return '[]'

  return entries
    .map((entry) => {
      const notes = entry.notes ? `,notes:"${entry.notes}"` : ''
      const pyramid =
        entry.pyramidTop || entry.pyramidMid || entry.pyramidBase
          ? `,top:"${entry.pyramidTop ?? ''}",mid:"${entry.pyramidMid ?? ''}",base:"${entry.pyramidBase ?? ''}"`
          : ''

      return `{id:${entry.id},brand:"${entry.brand}",frag:"${entry.fragrance}"${notes}${pyramid}}`
    })
    .join(', ')
}

function buildContextBlock(request: AnalyzePreferencesRequest): string[] {
  const context = request.context

  if (!context) {
    return ['Context: not provided.']
  }

  const profile = context.profile ?? {}
  const lines = [
    'Context:',
    `- profile: ${JSON.stringify({ ...profile, preferences: undefined, noteRelationships: undefined })}`,
    profile.gender !== undefined && profile.gender !== null
      ? `- user gender: ${profile.gender} (use appropriate pronouns in Russian and other gendered languages)`
      : `- user gender: not specified`,
    profile.preferences
      ? `- user preferences (verbatim, use when generating recommendations): ${profile.preferences}`
      : '',
    profile.noteRelationships && profile.noteRelationships.length > 0
      ? `- user note relationships (use when generating recommendations and profile): ${JSON.stringify(profile.noteRelationships)}`
      : '',
    `- budget: ${context.budget ?? 'not provided'}`,
  ].filter(Boolean)

  const diary = context.diary

  if (diary) {
    lines.push(
      'Diary (use id as rowId for move/rate/status/remove ops; notes/top/mid/base show current data if known):',
      `- owned: ${formatDiaryList((diary.owned ?? []) as DiaryContextEntry[])}`,
      `- to_try: ${formatDiaryList((diary.to_try ?? []) as DiaryContextEntry[])}`,
      `- liked: ${formatDiaryList((diary.liked ?? []) as DiaryContextEntry[])}`,
      `- neutral: ${formatDiaryList((diary.neutral ?? []) as DiaryContextEntry[])}`,
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
    analog: `Scenario analog: find the closest scent analogs for a fragrance the user mentions. Suggest up to 5 alternatives as tableOps (op=add, isTried=false, isLiked=null, isOwned=false). For each: set notesSummary (lowercase English), pyramidTop/Mid/Base (lowercase English) if known, and agentComment (in ${language}) explaining why it is a good analog. Write a friendly reply in ${language} explaining the picks and scent similarities.`,
    pyramid: [
      'Scenario pyramid: the user wants to know or update the olfactory pyramid (top/mid/base notes) of one or more fragrances.',
      'For each relevant fragrance already in the diary, generate a tableOp with op=status and rowId, setting pyramidTop, pyramidMid, pyramidBase (all lowercase English).',
      'If the fragrance is not yet in the diary, use op=add with brandName, fragranceName, isTried=false, isLiked=null, isOwned=false, and fill pyramidTop/Mid/Base (lowercase English).',
      'IMPORTANT: Always populate ALL THREE pyramid fields.',
      `Include a reply in ${language} describing the pyramid in a natural, conversational way.`,
    ].join(' '),
    recommendation: `Scenario recommendation: suggest fragrances the user would likely enjoy based on their diary and preferences. Set between ${request.minRecommendations ?? 5} and ${request.maxRecommendations ?? 20} recommendations. For each: id (unique string), brand, name, notesSummary (comma-separated lowercase English notes), pyramidTop/Mid/Base if known (lowercase English), tag (plain string in ${language} — WHY this fragrance suits them). This REPLACES the current recommendation list. Update suggestions to exactly 3 short first-person user messages in ${language} (max 60 chars each, e.g. "Find an analog for Santal 33", "What works for date nights?") — these appear as tappable chips the user can send. Include a helpful reply in ${language} presenting your picks.`,
    comparison: `Scenario comparison: compare two or more fragrances mentioned by the user. Highlight differences in notes, character, and suitability. Update ratings or move rows (using flags) if the user indicates clear preference. Include a reply in ${language} summarizing the comparison.`,
    command: [
      'Scenario command: the user gave a direct instruction OR a structured bulk import. Execute it precisely.',
      'BULK IMPORT: If the message contains section headers (like "# В НАЛИЧИИ", "В НАЛИЧИИ", "НРАВИТСЯ", "НЕ НРАВИТСЯ", "ПРИОРИТЕТ НА ТЕСТ", "В КОЛЛЕКЦИИ", "ХОЧУ ПОПРОБОВАТЬ", or English equivalents "OWNED", "LIKED", "DISLIKED", "TO TRY") treat each section as a list and generate op=add tableOps for EVERY fragrance listed.',
      'Map sections to flags: В НАЛИЧИИ/OWNED → isOwned=true, isTried=false, isLiked=null; НРАВИТСЯ/LIKED → isTried=true, isLiked=true, isOwned=false; НЕ НРАВИТСЯ/DISLIKED → isTried=true, isLiked=false, isOwned=false; ПРИОРИТЕТ НА ТЕСТ/TO TRY → isTried=false, isLiked=null, isOwned=false.',
      'For fragrances in both НРАВИТСЯ and В НАЛИЧИИ: isOwned=true, isTried=true, isLiked=true.',
      `Skip any fragrance already in the diary (check the context). For each op=add set notesSummary (lowercase English) and agentComment (in ${language}). Skip pyramidTop/Mid/Base for bulk import to keep response small.`,
      `PREFERENCES SECTION: If the message contains "ПРОФИЛЬ ПРЕДПОЧТЕНИЙ" or "PREFERENCES", save the full text verbatim to profile.preferences. Also update profile.archetype and profile.favoriteNote in ${language}.`,
      'BULK IMPORT OUTPUT SIZE: Omit suggestions for bulk imports.',
      `Single instruction: If adding a fragrance to try: use op=add with isTried=false, isLiked=null, isOwned=false, set brandName, fragranceName, notesSummary (lowercase English), pyramidTop/Mid/Base if known (lowercase English), and agentComment (in ${language} — WHY the user should try it). If adding to owned/liked/disliked: set flags accordingly.`,
      'If the user shares their opinion about a fragrance: use op=status with rowId and set userComment to their words (in their language).',
      'If rating: op=rate with rowId and rating (0-5).',
      'If moving between lists: op=move with rowId and new flag values.',
      `If updating agent comment: op=status with rowId and agentComment (in ${language}).`,
      'If removing: op=remove with rowId.',
      `If updating pyramid notes: op=status with rowId, set pyramidTop, pyramidMid, pyramidBase (lowercase English).`,
      'Set tableOps:[] only if the message is a pure question with no action requested.',
      `Always include a reply in ${language} confirming what you did, or answering the question.`,
    ].join(' '),
    // eslint-disable-next-line camelcase
    profile_sync: [
      'Scenario profile_sync: analyze the diary and update the user profile. No entry filling, no recommendations.',
      'UPDATE PROFILE: Base calculations on ALL lists: "owned", "liked", "neutral", and "disliked". Also consider user note relationships from context if provided.',
      `profile.archetype: a compact 2-4 word personality descriptor in ${language} based on patterns in pyramids/notes. Not a sentence, not a label — a concise personality tag (e.g. "фруктово-цитрусовый гурман", "цитрусовый эстет", "пряный oriental lover", "woody minimalist").`,
      `profile.favoriteNote: the single most prominent note in ${language} across liked/owned entries.`,
      'profile.radar: 4-7 lowercase English axis keys (e.g. "oud", "floral", "citrus", "woody"), integer values 0-100.',
      `profile.radarLabels: flat object keyed by axis key, values are labels in ${language}. Format: { "woody": "Древесный", "citrus": "Цитрусовый" }.`,
      `profile.rationale: brief explanation in ${language}.`,
      `profile.noteRelationships: analyze notes from ALL lists (liked, owned, disliked, neutral) — identify which notes appear consistently in liked/owned vs disliked entries. Output 5-20 entries. Each: note (English lowercase, e.g. "synthetic musk", "citrus", "oud"), sentiment (love|like|neutral|dislike|redflag), label (human-friendly phrase in ${language}, e.g. "Цитрусы — обожаю", "Синтетическая мускусная чистота — не моё"). Base redflag on notes found consistently in disliked entries.`,
      `suggestions: exactly 3 short first-person user messages in ${language} (max 60 chars each, e.g. "What suits me for evenings?") — tappable chips the user can send to continue the conversation.`,
      'If all diary lists are empty: set suggestions=[], skip profile updates.',
      `Include a brief reply in ${language} summarizing what was updated.`,
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
