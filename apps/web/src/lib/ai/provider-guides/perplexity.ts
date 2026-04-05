import type { ProviderGuide } from './types'

export const perplexity: ProviderGuide = {
  id: 'perplexity',
  signupUrl: 'https://www.perplexity.ai/settings/api',
  keyConsoleUrl: 'https://www.perplexity.ai/settings/api',
  docsUrl: 'https://docs.perplexity.ai/',
  steps: {
    en: [
      'Open Perplexity API settings and create a new API key.',
      'Copy the key and store it securely.',
      'Add the key to Oryxel (Perplexity provider).',
      'Verify that a supported model is selected for your use case (e.g. the sonar family).',
    ],
    ru: [
      'Откройте Perplexity API settings и создайте новый API key.',
      'Скопируйте ключ и сохраните его в безопасном месте.',
      'Добавьте ключ в Oryxel (провайдер Perplexity).',
      'Проверьте, что для вашего кейса выбрана доступная модель (например, sonar-семейство).',
    ],
    es: [
      'Abre Perplexity API settings y crea una nueva API key.',
      'Copia la clave y guárdala en un lugar seguro.',
      'Añade la clave en Oryxel (proveedor Perplexity).',
      'Verifica que el modelo seleccionado esté disponible para tu caso de uso (p. ej. familia sonar).',
    ],
    fr: [
      'Ouvrez les paramètres Perplexity API et créez une nouvelle API key.',
      'Copiez la clé et conservez-la en lieu sûr.',
      'Ajoutez la clé dans Oryxel (fournisseur Perplexity).',
      "Vérifiez qu'un modèle pris en charge est sélectionné pour votre cas d'usage (ex. famille sonar).",
    ],
    jp: [
      'Perplexity API settingsを開いて新しいAPIキーを作成。',
      'キーをコピーして安全な場所に保管。',
      'OryxelにキーをPerplexityプロバイダーとして追加。',
      'ユースケースに対応したモデルが選択されているか確認（例：sonarファミリー）。',
    ],
    zh: [
      '打开Perplexity API设置并创建新的API密钥。',
      '复制密钥并妥善保存。',
      '在Oryxel中添加密钥（Perplexity提供商）。',
      '确认为您的用例选择了支持的模型（例如sonar系列）。',
    ],
  },
  notes: {
    en: [
      'Perplexity API billing is separate from a regular Perplexity Pro subscription.',
      '401 — invalid or revoked key.',
      '429 — request limit or account quota reached.',
    ],
    ru: [
      'Perplexity API биллится отдельно от обычной подписки Perplexity Pro.',
      '401 — некорректный или отозванный ключ.',
      '429 — достигнут лимит запросов или квоты аккаунта.',
    ],
    es: [
      'El cobro de Perplexity API es independiente de la suscripción regular Perplexity Pro.',
      '401 — clave inválida o revocada.',
      '429 — límite de solicitudes o cuota de cuenta alcanzada.',
    ],
    fr: [
      "La facturation de l'API Perplexity est distincte de l'abonnement Perplexity Pro standard.",
      '401 — clé invalide ou révoquée.',
      '429 — limite de requêtes ou quota de compte atteint.',
    ],
    jp: [
      'Perplexity APIの課金は通常のPerplexity Proサブスクリプションとは別です。',
      '401 — 無効または取り消されたキー。',
      '429 — リクエスト制限またはアカウントクォータに達しました。',
    ],
    zh: [
      'Perplexity API的计费独立于普通Perplexity Pro订阅。',
      '401 — 密钥无效或已撤销。',
      '429 — 已达到请求限制或账户配额。',
    ],
  },
}
