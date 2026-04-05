import type { ProviderGuide } from './types'

export const anthropic: ProviderGuide = {
  id: 'anthropic',
  signupUrl: 'https://console.anthropic.com/login',
  keyConsoleUrl: 'https://console.anthropic.com/settings/keys',
  docsUrl: 'https://docs.anthropic.com/en/api/getting-started',
  steps: {
    en: [
      'Open Anthropic Console and go to Settings → API Keys.',
      'Create a new key and name it (e.g. Oryxel).',
      'Copy the key and save it in a password manager.',
      'Paste the key into Oryxel and test it with a chat request.',
    ],
    ru: [
      'Откройте Anthropic Console и перейдите в Settings → API Keys.',
      'Создайте новый ключ и подпишите его (например, Oryxel).',
      'Скопируйте ключ и сохраните в менеджере паролей.',
      'Вставьте ключ в Oryxel и протестируйте запрос в чате.',
    ],
    es: [
      'Abre Anthropic Console y ve a Settings → API Keys.',
      'Crea una nueva clave y asígnale un nombre (p. ej. Oryxel).',
      'Copia la clave y guárdala en un gestor de contraseñas.',
      'Pega la clave en Oryxel y pruébala con una solicitud de chat.',
    ],
    fr: [
      'Ouvrez Anthropic Console et allez dans Settings → API Keys.',
      'Créez une nouvelle clé et nommez-la (ex. Oryxel).',
      'Copiez la clé et enregistrez-la dans un gestionnaire de mots de passe.',
      'Collez la clé dans Oryxel et testez-la avec une requête de chat.',
    ],
    jp: [
      'Anthropic ConsoleでSettings → API Keysを開きます。',
      '新しいキーを作成して名前を付けます（例：Oryxel）。',
      'キーをコピーしてパスワードマネージャーに保存。',
      'キーをOryxelに貼り付けてチャットリクエストでテスト。',
    ],
    zh: [
      '打开Anthropic Console，进入Settings → API Keys。',
      '创建新密钥并命名（例如Oryxel）。',
      '复制密钥并保存到密码管理器。',
      '将密钥粘贴到Oryxel并通过聊天请求测试。',
    ],
  },
  notes: {
    en: [
      'Make sure the required model is available in your workspace.',
      '401 — invalid/deleted key; 403 — workspace/organization restrictions.',
      '429 — request limits or account quota.',
    ],
    ru: [
      'Убедитесь, что вашему workspace доступна нужная модель.',
      '401 — неверный/удаленный ключ; 403 — ограничения workspace/organization.',
      '429 — лимиты запросов или квота аккаунта.',
    ],
    es: [
      'Asegúrate de que el modelo requerido esté disponible en tu workspace.',
      '401 — clave inválida/eliminada; 403 — restricciones de workspace/organización.',
      '429 — límites de solicitudes o cuota de cuenta.',
    ],
    fr: [
      'Assurez-vous que le modèle requis est disponible dans votre workspace.',
      '401 — clé invalide/supprimée ; 403 — restrictions workspace/organisation.',
      '429 — limites de requêtes ou quota de compte.',
    ],
    jp: [
      '必要なモデルがワークスペースで利用可能か確認してください。',
      '401 — 無効/削除済みキー；403 — ワークスペース/組織の制限。',
      '429 — リクエスト制限またはアカウントクォータ。',
    ],
    zh: [
      '确保所需模型在您的工作区中可用。',
      '401 — 密钥无效/已删除；403 — 工作区/组织限制。',
      '429 — 请求限制或账户配额。',
    ],
  },
}
