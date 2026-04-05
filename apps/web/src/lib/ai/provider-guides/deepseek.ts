import type { ProviderGuide } from './types'

export const deepseek: ProviderGuide = {
  id: 'deepseek',
  signupUrl: 'https://platform.deepseek.com/sign_up',
  keyConsoleUrl: 'https://platform.deepseek.com/api_keys',
  docsUrl: 'https://platform.deepseek.com/docs',
  steps: {
    en: [
      'Go to DeepSeek Platform and create an account.',
      'Navigate to API Keys and create a new key.',
      'Copy the key and store it securely.',
      'Add the key to Oryxel (DeepSeek provider).',
    ],
    ru: [
      'Зайдите в DeepSeek Platform и создайте аккаунт.',
      'Перейдите в API Keys и создайте новый ключ.',
      'Скопируйте ключ и сохраните в безопасном месте.',
      'Добавьте ключ в Oryxel (провайдер DeepSeek).',
    ],
    es: [
      'Ve a DeepSeek Platform y crea una cuenta.',
      'Ve a API Keys y crea una nueva clave.',
      'Copia la clave y guárdala en un lugar seguro.',
      'Añade la clave en Oryxel (proveedor DeepSeek).',
    ],
    fr: [
      'Allez sur DeepSeek Platform et créez un compte.',
      'Accédez à API Keys et créez une nouvelle clé.',
      'Copiez la clé et conservez-la en lieu sûr.',
      'Ajoutez la clé dans Oryxel (fournisseur DeepSeek).',
    ],
    jp: [
      'DeepSeek Platformにアクセスしてアカウントを作成。',
      'API Keysに移動して新しいキーを作成。',
      'キーをコピーして安全な場所に保管。',
      'OryxelにキーをDeepSeekプロバイダーとして追加。',
    ],
    zh: [
      '前往DeepSeek Platform创建账户。',
      '进入API Keys并创建新密钥。',
      '复制密钥并妥善保存。',
      '在Oryxel中添加密钥（DeepSeek提供商）。',
    ],
  },
  notes: {
    en: [
      'DeepSeek V3 is very affordable ($0.27/$1.10 per 1M tokens).',
      'New accounts receive starter credits.',
      '401 — invalid key; 402 — insufficient credits.',
    ],
    ru: [
      'DeepSeek V3 очень дёшев ($0.27/$1.10 за 1M токенов).',
      'Новые аккаунты получают стартовые кредиты.',
      '401 — неверный ключ; 402 — недостаточно кредитов.',
    ],
    es: [
      'DeepSeek V3 es muy económico ($0.27/$1.10 por 1M tokens).',
      'Las cuentas nuevas reciben créditos iniciales.',
      '401 — clave inválida; 402 — créditos insuficientes.',
    ],
    fr: [
      'DeepSeek V3 est très abordable (0,27 $/1,10 $ par 1M tokens).',
      'Les nouveaux comptes reçoivent des crédits de départ.',
      '401 — clé invalide ; 402 — crédits insuffisants.',
    ],
    jp: [
      'DeepSeek V3は非常に安価（1Mトークンあたり$0.27/$1.10）。',
      '新規アカウントにはスタータークレジットが付与されます。',
      '401 — 無効なキー；402 — クレジット不足。',
    ],
    zh: [
      'DeepSeek V3价格非常实惠（每百万token $0.27/$1.10）。',
      '新账户可获得初始积分。',
      '401 — 密钥无效；402 — 积分不足。',
    ],
  },
}
