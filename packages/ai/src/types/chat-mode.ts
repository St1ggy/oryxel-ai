export const CHAT_AGENT_MODES = ['ask', 'agent', 'add', 'recommend', 'curate'] as const

export type ChatAgentMode = (typeof CHAT_AGENT_MODES)[number]

export type ModeSwitchReasonKey = 'add_intent' | 'ask_intent' | 'recommend_intent' | 'agent_intent' | 'curate_intent'

export type ModeSwitchSuggestion = {
  suggested: ChatAgentMode
  reasonKey: ModeSwitchReasonKey
}

export function nextChatMode(mode: ChatAgentMode) {
  const index = CHAT_AGENT_MODES.indexOf(mode)

  return CHAT_AGENT_MODES[(index + 1) % CHAT_AGENT_MODES.length]!
}
