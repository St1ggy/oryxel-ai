import { z } from 'zod'

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

function buildUserDisplayHardLimits(request: AnalyzePreferencesRequest): string[] {
  const minP = request.minPyramidNotes ?? 1
  const maxP = request.maxPyramidNotes ?? 5
  const minR = request.minRecommendations ?? 5
  const maxR = request.maxRecommendations ?? 20
  const analogMax = Math.min(5, maxR)

  return [
    'USER DISPLAY LIMITS (violations → INVALID):',
    `- Pyramid (pyramidTop|Mid|Base): non-empty tier = comma-separated tokens after trim (drop empties); ${minP}–${maxP} notes per non-empty tier.`,
    `- recommendation scenario: recommendations.length must be ${minR}–${maxR} inclusive (not fewer, not more).`,
    `- recommendation scenario: every entry MUST include pyramidTop AND pyramidMid AND pyramidBase, all non-empty, English lowercase, ${minP}–${maxP} notes per tier. If you do not know the real pyramid, infer it confidently from the brand+name+notesSummary; never leave a tier blank.`,
    `- analog scenario: at most ${analogMax} op=add per reply unless the user clearly asks for more; never more than ${maxR} new rows.`,
    `- Non-bulk op=add|op=status: populated tiers obey the pyramid bounds above.`,
  ]
}

function buildChatModeBlock(mode: AnalyzePreferencesRequest['chatMode']): string[] {
  switch (mode) {
    case 'ask':
      return [
        'MODE: questions only — answer conversationally in reply. tableOps must be []. Do not change profile, suggestions, recommendations, or agentMemoryOps.',
      ]
    case 'add':
      return [
        'MODE: additions only — use op=add in tableOps and/or recommendations[]. Never remove, move, rate, or change status. Do not change profile or suggestions.',
      ]
    case 'recommend':
      return [
        'MODE: recommendations refresh only — return a full new recommendations[]; tableOps []; omit profile, suggestions, agentMemoryOps.',
      ]
    case 'agent':
    default:
      return []
  }
}

function buildBaseInstructions(request: AnalyzePreferencesRequest): string[] {
  const language = languageForLocale(request.locale)
  const tableNames = tableNamesForLocale(request.locale)
  const allowAgentMemoryOps = request.allowAgentMemoryOps !== false
  const recommendationsOnly = request.recommendationsOnly === true || request.chatMode === 'recommend'
  const chatMode = request.chatMode ?? 'agent'

  const toneInstruction = request.tone
    ? `Communication style: ${request.tone}.`
    : 'Communication style: friendly and concise.'
  const depthInstruction = request.depth
    ? `Detail level: ${request.depth}.`
    : 'Detail level: balanced — enough context without being verbose.'

  return [
    "You are a helpful fragrance assistant for Oryxel — chat naturally, analyze preferences, manage the user's diary.",
    toneInstruction,
    depthInstruction,
    'Output: one JSON object only — no markdown, fences, or extra text. The shape is defined by the JSON Schema below.',
    `Languages — reply & summary: ${language}; notesSummary, pyramidTop/Mid/Base: English lowercase (e.g. "bergamot, lavender, musk"); archetype, favoriteNote, agentComment, recommendations[].tag: ${language} (shown as-is).`,
    'reply: conversational answer. summary: 1–2 sentences on what changed.',
    allowAgentMemoryOps ? null : 'Memory is not editable here — omit agentMemoryOps even though the schema allows it.',
    'Flag mapping: not tried yet → isTried=false,isLiked=false,isDisliked=false,isOwned=false; liked → isTried=true,isLiked=true,isDisliked=false; disliked → isTried=true,isLiked=false,isDisliked=true; neutral (tried, no opinion) → isTried=true,isLiked=false,isDisliked=false,isOwned=false; collection → isOwned=true (may combine with liked/disliked).',
    `UI list names in reply — to_try="${tableNames.to_try}"; liked="${tableNames.liked}"; neutral="${tableNames.neutral}"; disliked="${tableNames.disliked}"; owned="${tableNames.owned}".`,
    'op=add: brandName + fragranceName + flags; no fragranceId for new rows.',
    'op=rate|status|move|remove: rowId = exact id from the diary context below — never invent. If the row is missing, use op=add instead.',
    'op=move: rowId + new flag values.',
    'notesSummary: up to 5 key notes, English, comma-separated.',
    `pyramidTop|Mid|Base: English comma-separated, ${request.minPyramidNotes ?? 1}–${request.maxPyramidNotes ?? 5} notes per non-empty tier; fill all three when known.`,
    `agentComment: one punchy line in ${language}, ≤80 chars, scent essence (e.g. "Warm amber with smoky oud"); no full sentences, no "because", no user reference.`,
    `userComment: only quote what the user actually said about the scent; omit if they did not.`,
    'season: CSV from spring,summer,autumn,winter. timeOfDay: CSV from day,evening,night.',
    `gender: female | male | unisex inferred from character/notes (not marketing only); unisex when truly fitting.`,
    'Bulk import (many rows): omit suggestions.',
    ...(allowAgentMemoryOps
      ? [
          'agentMemoryOps: only when the user asks to remember/forget/fix memory. Use add for new facts, update with id (from "Long-term memory" in context) to revise, remove with id to delete. Never invent ids.',
        ]
      : []),
    ...(recommendationsOnly
      ? [
          'MODE: recommendations refresh only — return a full new recommendations[]; tableOps []; omit profile, suggestions, agentMemoryOps.',
        ]
      : []),
    ...buildChatModeBlock(chatMode),
  ].filter(Boolean) as string[]
}

type DiaryContextEntry = {
  id: number
  brand: string
  fragrance: string
  notes?: string | null
  pyramidTop?: string | null
  pyramidMid?: string | null
  pyramidBase?: string | null
  rating?: number | null
}

const SCENARIOS_NEEDING_FULL_PYRAMID = new Set(['pyramid', 'analog', 'comparison'])

function formatDiaryList(entries: DiaryContextEntry[], scenario: string): string {
  if (entries.length === 0) return '[]'

  const includePyramidAndNotes = SCENARIOS_NEEDING_FULL_PYRAMID.has(scenario)

  return entries
    .map((entry) => {
      const notes = includePyramidAndNotes && entry.notes ? `,notes:"${entry.notes}"` : ''
      const pyramid =
        includePyramidAndNotes && (entry.pyramidTop || entry.pyramidMid || entry.pyramidBase)
          ? `,top:"${entry.pyramidTop ?? ''}",mid:"${entry.pyramidMid ?? ''}",base:"${entry.pyramidBase ?? ''}"`
          : ''
      const rating = entry.rating ? `,rating:${entry.rating}` : ''

      return `{id:${entry.id},brand:"${entry.brand}",frag:"${entry.fragrance}"${notes}${pyramid}${rating}}`
    })
    .join(', ')
}

const SCENARIOS_NEEDING_NOTE_RELATIONSHIPS = new Set(['recommendation', 'profile_sync'])
const RECENT_MESSAGE_LIMIT = 3
const RECENT_MESSAGE_CHAR_LIMIT = 280
const MAX_EXCLUDE_IDS = 200

function clampRecent(content: string): string {
  return content.length > RECENT_MESSAGE_CHAR_LIMIT ? `${content.slice(0, RECENT_MESSAGE_CHAR_LIMIT)}…` : content
}

type DiaryContext = NonNullable<NonNullable<AnalyzePreferencesRequest['context']>['diary']>

function collectExcludeIds(diary: DiaryContext): number[] {
  const seen = new Set<number>()
  const lists: readonly ({ id: number }[] | undefined)[] = [
    diary.owned,
    diary.to_try,
    diary.liked,
    diary.neutral,
    diary.disliked,
    diary.dismissed,
  ]

  for (const list of lists) {
    if (!list) continue

    for (const entry of list) seen.add(entry.id)
  }

  return [...seen]
}

function buildExcludeLine(diary: DiaryContext): string | null {
  const ids = collectExcludeIds(diary)

  if (ids.length === 0) return null

  const truncated = ids.slice(0, MAX_EXCLUDE_IDS)
  const suffix = ids.length > MAX_EXCLUDE_IDS ? `,…(+${ids.length - MAX_EXCLUDE_IDS})` : ''

  return `- exclude (already in diary or dismissed; never recommend these fragranceIds): ${truncated.join(',')}${suffix}`
}

/* eslint-disable sonarjs/cognitive-complexity */
function buildContextBlock(request: AnalyzePreferencesRequest): string[] {
  const context = request.context

  if (!context) {
    return ['Context: not provided.']
  }

  const scenario = request.scenario
  const includeRelationships = SCENARIOS_NEEDING_NOTE_RELATIONSHIPS.has(scenario)
  const profile = context.profile ?? {}
  const lines = [
    'Context:',
    `- profile: ${JSON.stringify({ ...profile, noteRelationships: undefined, preferences: undefined })}`,
    profile.gender !== undefined && profile.gender !== null
      ? `- gender: ${profile.gender} (pronouns: gendered langs e.g. Russian)`
      : '- gender: not specified',
    profile.preferences ? `- preferences (verbatim, for recs): ${profile.preferences}` : '',
    includeRelationships && profile.noteRelationships && profile.noteRelationships.length > 0
      ? `- noteRelationships (recs + profile): ${JSON.stringify(profile.noteRelationships)}`
      : '',
    `- budget: ${context.budget ?? 'not provided'}`,
  ].filter(Boolean)

  const diary = context.diary

  if (diary) {
    const fullPyramid = SCENARIOS_NEEDING_FULL_PYRAMID.has(scenario)
    const header = fullPyramid
      ? 'Diary — rowId for move/rate/status/remove: exact id below; never invent; missing row → op=add. Fields notes/top/mid/base = current:'
      : 'Diary — rowId for move/rate/status/remove: exact id below; never invent; missing row → op=add. Compact list (id+brand+frag only):'

    lines.push(
      header,
      `- owned: ${formatDiaryList((diary.owned ?? []) as DiaryContextEntry[], scenario)}`,
      `- to_try: ${formatDiaryList((diary.to_try ?? []) as DiaryContextEntry[], scenario)}`,
      `- liked: ${formatDiaryList((diary.liked ?? []) as DiaryContextEntry[], scenario)}`,
      `- neutral: ${formatDiaryList((diary.neutral ?? []) as DiaryContextEntry[], scenario)}`,
      `- disliked: ${formatDiaryList((diary.disliked ?? []) as DiaryContextEntry[], scenario)}`,
    )

    const exclude = buildExcludeLine(diary)

    if (exclude) lines.push(exclude)
  }

  if (context.recentMessages && context.recentMessages.length > 0) {
    const recent = context.recentMessages.slice(-RECENT_MESSAGE_LIMIT)

    lines.push('Recent messages:')

    for (const message of recent) {
      lines.push(`- ${message.role === 'user' ? 'User' : 'Assistant'}: ${clampRecent(message.content)}`)
    }
  }

  if (context.agentMemoryEntries && context.agentMemoryEntries.length > 0) {
    lines.push('Long-term memory (stable; ids for agentMemoryOps update/remove):')

    for (const entry of context.agentMemoryEntries) {
      lines.push(`- ${entry.id}: ${entry.content}`)
    }
  }

  return lines
}
/* eslint-enable sonarjs/cognitive-complexity */

function buildScenarioBlock(request: AnalyzePreferencesRequest): string[] {
  const scenario = request.scenario
  const language = languageForLocale(request.locale)
  const minP = request.minPyramidNotes ?? 1
  const maxP = request.maxPyramidNotes ?? 5
  const minR = request.minRecommendations ?? 5
  const maxR = request.maxRecommendations ?? 20
  const analogMax = Math.min(5, maxR)
  const scenarioInstructions: Record<AnalyzePreferencesRequest['scenario'], string> = {
    analog: `analog: closest scent analogs. ≤${analogMax} op=add (isTried=false,isLiked=false,isDisliked=false,isOwned=false) unless user asks more; ≤${maxR} rows. Each: notesSummary + pyramid (English lowercase, ${minP}–${maxP} notes/tier when set), agentComment (${language}). Reply (${language}): picks + scent similarities.`,
    pyramid: [
      `pyramid: top/mid/base. Existing diary row → op=status, rowId, pyramid (English lc). Not listed → op=add, isTried=false,isLiked=false,isDisliked=false,isOwned=false, brand+name, pyramid (English lc). Fill all three tiers when known.`,
      `${minP}–${maxP} comma-separated notes per non-empty tier (USER DISPLAY LIMITS). Reply (${language}), natural/conversational.`,
    ].join(' '),
    recommendation: `recommendation: suggest from diary + prefs. HARD: recommendations.length ${minR}–${maxR} (else INVALID). HARD: never propose any fragranceId from the exclude list (already in diary or dismissed). HARD: every entry must include pyramidTop, pyramidMid, pyramidBase — all non-empty, English lowercase, ${minP}–${maxP} notes per tier. (1) gender male→male/unisex; female→female/unisex; else all. (2) bio + preferences → personality/aesthetic. (3) noteRelationships → prefer love/like; avoid redflag/dislike. Each: id (unique short STRING slug like "r1","r2","rec-amber" — NEVER a number, NEVER a fragranceId), brand, name, notesSummary (English lc), pyramidTop+pyramidMid+pyramidBase (REQUIRED, English lc), tag (${language}, why for THIS user), gender, timeOfDay CSV, season CSV. Replaces list. suggestions: 3 first-person chat prompts the user could tap to send next, ≤60 chars in ${language}; phrase as a question or imperative request, NOT as a note description (good: "Покажи аналог Baccarat Rouge","Что-то свежее на лето","Тёплый аромат для ужина"; bad: "Бергамот с морской солью"). Reply (${language}): picks + fit to user style.`,
    comparison: `comparison: compare ≥2 named frags — notes, character, fit. Rate/move if user shows preference. Reply (${language}).`,
    command: [
      'command: direct instruction or bulk import — execute exactly.',
      'BULK: headers "# В НАЛИЧИИ","В НАЛИЧИИ","НРАВИТСЯ","НЕ НРАВИТСЯ","ПРИОРИТЕТ НА ТЕСТ","В КОЛЛЕКЦИИ","ХОЧУ ПОПРОБОВАТЬ" or "OWNED","LIKED","DISLIKED","TO TRY" → each section is a list; op=add for EVERY row.',
      'Map: В НАЛИЧИИ/OWNED → isOwned=true,isTried=false,isLiked=false,isDisliked=false; НРАВИТСЯ/LIKED → isTried=true,isLiked=true,isDisliked=false,isOwned=false; НЕ НРАВИТСЯ/DISLIKED → isTried=true,isLiked=false,isDisliked=true,isOwned=false; ПРИОРИТЕТ НА ТЕСТ/TO TRY → isTried=false,isLiked=false,isDisliked=false,isOwned=false.',
      'In both НРАВИТСЯ and В НАЛИЧИИ: isOwned=true,isTried=true,isLiked=true.',
      `Skip rows already in diary. Bulk op=add: notesSummary (English lc) + agentComment (${language}); omit pyramid.`,
      `If "ПРОФИЛЬ ПРЕДПОЧТЕНИЙ" or "PREFERENCES": save verbatim → profile.preferences; set archetype + favoriteNote (${language}).`,
      'Bulk: omit suggestions.',
      `Single add to try: op=add, isTried=false,isLiked=false,isDisliked=false,isOwned=false, brand+name, notesSummary, pyramid if known, agentComment (${language}, why try). Other lists: flags per Map line.`,
      'User opinion on row: op=status + userComment (their words).',
      'Rating: op=rate, rowId, 0–5.',
      'Move list: op=move, rowId, new flags.',
      `Agent comment only: op=status, rowId, agentComment (${language}).`,
      'Remove: op=remove, rowId.',
      `Pyramid update: op=status, rowId, pyramid (English lc); non-empty tiers ${minP}–${maxP} notes.`,
      'Pure Q, no action → tableOps [].',
      `Reply (${language}): confirm or answer.`,
    ].join(' '),
    // eslint-disable-next-line camelcase
    profile_sync: [
      `profile_sync: diary → profile updates only; no diary rows, no recommendations, no agentMemoryOps.`,
      'Ground in owned, liked, neutral, disliked + noteRelationships from context if present.',
      `profile.archetype: 2–4 words, ${language}, from pyramids/notes — tag not prose (e.g. "фруктово-цитрусовый гурман","цитрусовый эстет","пряный oriental lover","woody minimalist").`,
      `profile.favoriteNote: single most prominent note in ${language} across liked+owned.`,
      'profile.radar: 4–7 English lc axis keys (oud,floral,citrus,woody), 0–100.',
      `profile.radarLabels: axis→label in ${language}; SHORT label, ≤20 chars; no commas, no dashes/em-dashes, no parentheses, no commentary or descriptions — just the axis name (good: "Древесные","Цитрусы","Citrus","シトラス"; bad: "Древесный — тёплый, с дымным акцентом").`,
      `profile.rationale: brief, ${language}.`,
      `profile.noteRelationships: 5–20 entries from all lists — patterns in liked/owned vs disliked. Each: note (English lc), sentiment love|like|neutral|dislike|redflag, label (${language}), agentComment (1 sentence, ${language}). If lockedByUser=true: keep sentiment+label; only agentComment may change.`,
      `suggestions: 3 first-person chat prompts the user could tap to send next, ≤60 chars in ${language}; phrase as a question or imperative request, NOT as a note description (good: "Покажи аналог Baccarat Rouge","Что-то свежее на лето","Тёплый аромат для ужина"; bad: "Бергамот с морской солью").`,
      'All diary empty → suggestions=[], skip profile fields.',
      `Reply (${language}): brief summary of updates.`,
    ].join(' '),
  }

  return [`Scenario: ${scenario}`, scenarioInstructions[scenario]]
}

/** Rough token estimate (Latin + Cyrillic mixed; ~4 chars/token). Not a billing count. */
export function estimatePromptTokensApprox(text: string): number {
  return Math.ceil(text.length / 4)
}

let cachedOutputSchemaJson: string | undefined

/** JSON Schema for the patch the model must emit. Cached — schema is static across requests. */
function getOutputSchemaJson(): string {
  if (cachedOutputSchemaJson) return cachedOutputSchemaJson

  const schema = z.toJSONSchema(structuredPreferencePatchSchema, { unrepresentable: 'any' })

  cachedOutputSchemaJson = JSON.stringify(schema)

  return cachedOutputSchemaJson
}

function buildOutputSchemaSection(): string[] {
  return [
    'Output schema (JSON Schema 2020-12). The response MUST validate against this schema — field names, types, enums, lengths, ranges:',
    '```json',
    getOutputSchemaJson(),
    '```',
  ]
}

/** Instruction blocks only (no trailing `User message:` line). */
export function buildPromptInstructionBlock(request: AnalyzePreferencesRequest): string {
  return [
    ...buildBaseInstructions(request),
    ...buildOutputSchemaSection(),
    ...buildUserDisplayHardLimits(request),
    ...buildContextBlock(request),
    ...buildScenarioBlock(request),
  ].join('\n')
}

export type PromptSection = { key: string; label: string; content: string }

/** Structured breakdown for UI (token map). */
export function buildPromptSections(request: AnalyzePreferencesRequest): PromptSection[] {
  const sections: PromptSection[] = [
    { key: 'base', label: 'Base instructions', content: buildBaseInstructions(request).join('\n') },
    { key: 'schema', label: 'Output schema', content: buildOutputSchemaSection().join('\n') },
    { key: 'limits', label: 'User display limits', content: buildUserDisplayHardLimits(request).join('\n') },
    { key: 'context', label: 'Context', content: buildContextBlock(request).join('\n') },
    { key: 'scenario', label: 'Scenario', content: buildScenarioBlock(request).join('\n') },
    { key: 'user_message', label: 'User message', content: `User message: ${request.message}` },
  ]

  return sections
}

export type SystemPromptMode = 'default' | 'append' | 'replace'

export function buildPromptWithOptions(
  request: AnalyzePreferencesRequest,
  options?: {
    mode?: SystemPromptMode
    append?: string | null
    replace?: string | null
  },
): string {
  const instructionBlock = buildPromptInstructionBlock(request)
  const userLine = `User message: ${request.message}`
  const mode = options?.mode ?? 'default'

  if (mode === 'replace' && options?.replace?.trim()) {
    return `${options.replace.trim()}\n\n${userLine}`
  }

  if (mode === 'append' && options?.append?.trim()) {
    return `${instructionBlock}\n\n--- Additional instructions ---\n${options.append.trim()}\n\n${userLine}`
  }

  return `${instructionBlock}\n${userLine}`
}

function resolvePromptOptions(request: AnalyzePreferencesRequest): {
  mode: SystemPromptMode
  append: string | null
  replace: string | null
} {
  const mode = request.systemPromptMode ?? 'default'

  return {
    mode,
    append: request.systemPromptAppend ?? null,
    replace: request.systemPromptReplace ?? null,
  }
}

export function buildPrompt(request: AnalyzePreferencesRequest): string {
  const o = resolvePromptOptions(request)

  return buildPromptWithOptions(request, { mode: o.mode, append: o.append, replace: o.replace })
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
