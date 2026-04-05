import type { ProviderGuide } from './types'

export const openai: ProviderGuide = {
  id: 'openai',
  signupUrl: 'https://platform.openai.com/signup',
  keyConsoleUrl: 'https://platform.openai.com/api-keys',
  docsUrl: 'https://platform.openai.com/docs/quickstart',
  steps: {
    en: [
      'Go to OpenAI Platform and open API Keys.',
      'Click Create new secret key and give it a name (e.g. Oryxel Prod).',
      'Copy the key immediately after creation — the full key is shown only once.',
      'Add the key to Oryxel and optionally set it as the default provider.',
    ],
    ru: [
      'Зайдите в OpenAI Platform и откройте API Keys.',
      'Нажмите Create new secret key и задайте понятное имя (например, Oryxel Prod).',
      'Скопируйте ключ сразу после создания (полный ключ показывается один раз).',
      'Добавьте ключ в Oryxel и при необходимости сделайте провайдера дефолтным.',
    ],
    es: [
      'Ve a OpenAI Platform y abre API Keys.',
      'Haz clic en Create new secret key y asígnale un nombre (p. ej. Oryxel Prod).',
      'Copia la clave inmediatamente después de crearla — se muestra completa solo una vez.',
      'Añade la clave en Oryxel y si quieres ponla como proveedor por defecto.',
    ],
    fr: [
      'Allez sur OpenAI Platform et ouvrez API Keys.',
      'Cliquez sur Create new secret key et donnez-lui un nom (ex. Oryxel Prod).',
      'Copiez la clé immédiatement après la création — elle est affichée complète une seule fois.',
      'Ajoutez la clé dans Oryxel et définissez-la comme fournisseur par défaut si nécessaire.',
    ],
    jp: [
      'OpenAI PlatformでAPI Keysを開きます。',
      'Create new secret keyをクリックして名前を付けます（例：Oryxel Prod）。',
      '作成直後にキーをコピー——完全なキーは一度だけ表示されます。',
      'OryxelにキーをOpenAIプロバイダーとして追加（必要に応じてデフォルトに設定）。',
    ],
    zh: [
      '前往OpenAI Platform并打开API Keys。',
      '点击Create new secret key并命名（例如Oryxel Prod）。',
      '创建后立即复制密钥——完整密钥仅显示一次。',
      '在Oryxel中添加密钥，并可选择设为默认提供商。',
    ],
  },
  notes: {
    en: [
      'Active billing/credits in your OpenAI account are required for API calls.',
      '401 usually means an invalid or revoked key.',
      '429 — RPM/TPM rate limit or credits exhausted.',
    ],
    ru: [
      'Для вызовов API нужен активный биллинг/кредиты в OpenAI аккаунте.',
      'Ошибка 401 обычно означает неверный или отозванный ключ.',
      'Ошибка 429 — исчерпан лимит RPM/TPM или кредиты.',
    ],
    es: [
      'Se requiere facturación/créditos activos en tu cuenta de OpenAI para las llamadas a la API.',
      'El error 401 suele indicar una clave inválida o revocada.',
      '429 — límite de RPM/TPM o créditos agotados.',
    ],
    fr: [
      'Un compte OpenAI avec facturation/crédits actifs est nécessaire pour les appels API.',
      '401 indique généralement une clé invalide ou révoquée.',
      '429 — limite RPM/TPM atteinte ou crédits épuisés.',
    ],
    jp: [
      'API呼び出しにはOpenAIアカウントの有効な課金/クレジットが必要です。',
      '401は通常、無効または取り消されたキーを意味します。',
      '429 — RPM/TPMレート制限またはクレジット枯渇。',
    ],
    zh: [
      'API调用需要OpenAI账户中有效的计费/积分。',
      '401通常表示密钥无效或已撤销。',
      '429 — RPM/TPM速率限制或积分耗尽。',
    ],
  },
}
