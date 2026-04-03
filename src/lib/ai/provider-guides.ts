export type ProviderGuideId = 'openai' | 'anthropic' | 'gemini' | 'qwen' | 'perplexity' | 'groq' | 'deepseek'

export type ProviderGuide = {
  id: ProviderGuideId
  signupUrl: string
  keyConsoleUrl: string
  docsUrl: string
  steps: string[]
  notes: string[]
}

export const PROVIDER_GUIDES: Record<ProviderGuideId, ProviderGuide> = {
  groq: {
    id: 'groq',
    signupUrl: 'https://console.groq.com/login',
    keyConsoleUrl: 'https://console.groq.com/keys',
    docsUrl: 'https://console.groq.com/docs/openai',
    steps: [
      'Откройте Groq Console и зарегистрируйтесь (бесплатно).',
      'Перейдите в раздел API Keys и нажмите Create API Key.',
      'Скопируйте ключ — он показывается только один раз.',
      'Добавьте ключ в Oryxel (провайдер Groq).',
    ],
    notes: [
      'Бесплатный тариф: 14 400 запросов в сутки на большинстве моделей.',
      'Groq использует LPU-ускорители — ответы очень быстрые.',
      '429 — превышен дневной лимит бесплатного плана.',
    ],
  },
  deepseek: {
    id: 'deepseek',
    signupUrl: 'https://platform.deepseek.com/sign_up',
    keyConsoleUrl: 'https://platform.deepseek.com/api_keys',
    docsUrl: 'https://platform.deepseek.com/docs',
    steps: [
      'Зайдите в DeepSeek Platform и создайте аккаунт.',
      'Перейдите в API Keys и создайте новый ключ.',
      'Скопируйте ключ и сохраните в безопасном месте.',
      'Добавьте ключ в Oryxel (провайдер DeepSeek).',
    ],
    notes: [
      'DeepSeek V3 очень дёшев ($0.27/$1.10 за 1M токенов).',
      'Новые аккаунты получают стартовые кредиты.',
      '401 — неверный ключ; 402 — недостаточно кредитов.',
    ],
  },
  openai: {
    id: 'openai',
    signupUrl: 'https://platform.openai.com/signup',
    keyConsoleUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs/quickstart',
    steps: [
      'Зайдите в OpenAI Platform и откройте API Keys.',
      'Нажмите Create new secret key и задайте понятное имя (например, Oryxel Prod).',
      'Скопируйте ключ сразу после создания (полный ключ показывается один раз).',
      'Добавьте ключ в Oryxel и при необходимости сделайте провайдера дефолтным.',
    ],
    notes: [
      'Для вызовов API нужен активный биллинг/кредиты в OpenAI аккаунте.',
      'Ошибка 401 обычно означает неверный или отозванный ключ.',
      'Ошибка 429 — исчерпан лимит RPM/TPM или кредиты.',
    ],
  },
  anthropic: {
    id: 'anthropic',
    signupUrl: 'https://console.anthropic.com/login',
    keyConsoleUrl: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com/en/api/getting-started',
    steps: [
      'Откройте Anthropic Console и перейдите в Settings -> API Keys.',
      'Создайте новый ключ и подпишите его (например, Oryxel).',
      'Скопируйте ключ и сохраните в менеджере паролей.',
      'Вставьте ключ в Oryxel и протестируйте запрос в чате.',
    ],
    notes: [
      'Убедитесь, что вашему workspace доступна нужная модель.',
      '401 — неверный/удаленный ключ; 403 — ограничения workspace/organization.',
      '429 — лимиты запросов или квота аккаунта.',
    ],
  },
  gemini: {
    id: 'gemini',
    signupUrl: 'https://aistudio.google.com/app/apikey',
    keyConsoleUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    steps: [
      'Откройте Google AI Studio и перейдите в раздел API keys.',
      'Создайте ключ для нужного Google Cloud проекта.',
      'Скопируйте ключ и убедитесь, что используете правильный проект.',
      'Добавьте ключ в Oryxel (провайдер Gemini) и сохраните.',
    ],
    notes: [
      'Проверьте, что для проекта включены нужные Gemini API/квоты.',
      '403 часто связан с правами проекта или региональными ограничениями.',
      '429 означает, что превышены лимиты использования.',
    ],
  },
  qwen: {
    id: 'qwen',
    signupUrl: 'https://www.alibabacloud.com/help/en/model-studio/first-api-call-to-qwen',
    keyConsoleUrl: 'https://modelstudio.console.alibabacloud.com/?tab=playground#/api-key',
    docsUrl: 'https://www.alibabacloud.com/help/model-studio/get-api-key',
    steps: [
      'Войдите в Alibaba Cloud Model Studio и выберите нужный регион в правом верхнем углу.',
      'Откройте API Key page и нажмите Create API Key.',
      'Выберите workspace (обычно default), создайте ключ и сразу скопируйте его.',
      'Добавьте ключ в Oryxel как Qwen. Если есть 401/403, проверьте соответствие региона и endpoint.',
    ],
    notes: [
      'Ключ региона должен совпадать с endpoint региона (частая причина ошибок).',
      '401 — неверный ключ или mismatch регион/endpoint.',
      '429 — лимиты/квоты. Проверьте Free Trial и Billing в Alibaba Cloud.',
    ],
  },
  perplexity: {
    id: 'perplexity',
    signupUrl: 'https://www.perplexity.ai/settings/api',
    keyConsoleUrl: 'https://www.perplexity.ai/settings/api',
    docsUrl: 'https://docs.perplexity.ai/',
    steps: [
      'Откройте Perplexity API settings и создайте новый API key.',
      'Скопируйте ключ и сохраните его в безопасном месте.',
      'Добавьте ключ в Oryxel (провайдер Perplexity).',
      'Проверьте, что для вашего кейса выбрана доступная модель (например, sonar-семейство).',
    ],
    notes: [
      'Perplexity API биллится отдельно от обычной подписки Perplexity Pro.',
      '401 — некорректный или отозванный ключ.',
      '429 — достигнут лимит запросов или квоты аккаунта.',
    ],
  },
}
