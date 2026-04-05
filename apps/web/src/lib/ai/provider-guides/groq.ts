import type { ProviderGuide } from './types'

export const groq: ProviderGuide = {
  id: 'groq',
  signupUrl: 'https://console.groq.com/login',
  keyConsoleUrl: 'https://console.groq.com/keys',
  docsUrl: 'https://console.groq.com/docs/openai',
  steps: {
    en: [
      'Open Groq Console and sign up (free).',
      'Go to API Keys and click Create API Key.',
      'Copy the key — it is shown only once.',
      'Add the key to Oryxel (Groq provider).',
    ],
    ru: [
      'Откройте Groq Console и зарегистрируйтесь (бесплатно).',
      'Перейдите в раздел API Keys и нажмите Create API Key.',
      'Скопируйте ключ — он показывается только один раз.',
      'Добавьте ключ в Oryxel (провайдер Groq).',
    ],
    es: [
      'Abre Groq Console y regístrate (gratis).',
      'Ve a API Keys y haz clic en Create API Key.',
      'Copia la clave — se muestra una sola vez.',
      'Añade la clave en Oryxel (proveedor Groq).',
    ],
    fr: [
      'Ouvrez Groq Console et inscrivez-vous (gratuit).',
      'Allez dans API Keys et cliquez sur Create API Key.',
      'Copiez la clé — elle est affichée une seule fois.',
      'Ajoutez la clé dans Oryxel (fournisseur Groq).',
    ],
    jp: [
      'Groq Consoleを開いて登録します（無料）。',
      'API Keysに移動してCreate API Keyをクリック。',
      'キーをコピー（一度だけ表示されます）。',
      'OryxelにキーをGroqプロバイダーとして追加。',
    ],
    zh: [
      '打开Groq Console并注册（免费）。',
      '进入API Keys，点击Create API Key。',
      '复制密钥——仅显示一次。',
      '在Oryxel中添加密钥（Groq提供商）。',
    ],
  },
  notes: {
    en: [
      'Free tier: 14,400 requests/day on most models.',
      'Groq uses LPU accelerators — responses are very fast.',
      '429 means the daily free-plan limit is exceeded.',
    ],
    ru: [
      'Бесплатный тариф: 14 400 запросов в сутки на большинстве моделей.',
      'Groq использует LPU-ускорители — ответы очень быстрые.',
      '429 — превышен дневной лимит бесплатного плана.',
    ],
    es: [
      'Nivel gratuito: 14.400 solicitudes/día en la mayoría de modelos.',
      'Groq usa aceleradores LPU — respuestas muy rápidas.',
      '429 significa que se superó el límite diario del plan gratuito.',
    ],
    fr: [
      'Niveau gratuit : 14 400 requêtes/jour sur la plupart des modèles.',
      'Groq utilise des accélérateurs LPU — réponses très rapides.',
      '429 signifie que la limite journalière du plan gratuit est dépassée.',
    ],
    jp: [
      '無料プラン：ほとんどのモデルで1日14,400リクエスト。',
      'GroqはLPUアクセラレーターを使用 — 応答が非常に速い。',
      '429は無料プランの1日制限を超えたことを意味します。',
    ],
    zh: [
      '免费套餐：大多数模型每天14,400次请求。',
      'Groq使用LPU加速器——响应非常快。',
      '429表示超过了免费计划的每日限制。',
    ],
  },
}
