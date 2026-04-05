export type ProviderGuideId = 'openai' | 'anthropic' | 'gemini' | 'qwen' | 'perplexity' | 'groq' | 'deepseek'

export type ProviderGuide = {
  id: ProviderGuideId
  signupUrl: string
  keyConsoleUrl: string
  docsUrl: string
  steps: Record<string, string[]>
  notes: Record<string, string[]>
}
