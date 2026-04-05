import type { ProviderGuide } from './types'

export const gemini: ProviderGuide = {
  id: 'gemini',
  signupUrl: 'https://aistudio.google.com/app/apikey',
  keyConsoleUrl: 'https://aistudio.google.com/app/apikey',
  docsUrl: 'https://ai.google.dev/gemini-api/docs',
  steps: {
    en: [
      'Open Google AI Studio and go to the API keys section.',
      'Create a key for the required Google Cloud project.',
      'Copy the key and ensure you are using the correct project.',
      'Add the key to Oryxel (Gemini provider) and save.',
    ],
    ru: [
      'Откройте Google AI Studio и перейдите в раздел API keys.',
      'Создайте ключ для нужного Google Cloud проекта.',
      'Скопируйте ключ и убедитесь, что используете правильный проект.',
      'Добавьте ключ в Oryxel (провайдер Gemini) и сохраните.',
    ],
    es: [
      'Abre Google AI Studio y ve a la sección API keys.',
      'Crea una clave para el proyecto de Google Cloud requerido.',
      'Copia la clave y asegúrate de estar usando el proyecto correcto.',
      'Añade la clave en Oryxel (proveedor Gemini) y guarda.',
    ],
    fr: [
      'Ouvrez Google AI Studio et allez dans la section API keys.',
      'Créez une clé pour le projet Google Cloud requis.',
      "Copiez la clé et assurez-vous d'utiliser le bon projet.",
      'Ajoutez la clé dans Oryxel (fournisseur Gemini) et sauvegardez.',
    ],
    jp: [
      'Google AI StudioでAPI keysセクションに移動。',
      '必要なGoogle CloudプロジェクトのキーをCreate。',
      'キーをコピーして正しいプロジェクトを使用しているか確認。',
      'OryxelにキーをGeminiプロバイダーとして追加して保存。',
    ],
    zh: [
      '打开Google AI Studio，进入API keys部分。',
      '为所需的Google Cloud项目创建密钥。',
      '复制密钥并确保使用正确的项目。',
      '在Oryxel中添加密钥（Gemini提供商）并保存。',
    ],
  },
  notes: {
    en: [
      'Make sure the required Gemini APIs/quotas are enabled for the project.',
      '403 often relates to project permissions or regional restrictions.',
      '429 means usage limits are exceeded.',
    ],
    ru: [
      'Проверьте, что для проекта включены нужные Gemini API/квоты.',
      '403 часто связан с правами проекта или региональными ограничениями.',
      '429 означает, что превышены лимиты использования.',
    ],
    es: [
      'Asegúrate de que las APIs/cuotas de Gemini necesarias estén habilitadas para el proyecto.',
      '403 suele relacionarse con permisos del proyecto o restricciones regionales.',
      '429 significa que se superaron los límites de uso.',
    ],
    fr: [
      'Assurez-vous que les API/quotas Gemini requis sont activés pour le projet.',
      '403 est souvent lié aux autorisations du projet ou aux restrictions régionales.',
      "429 signifie que les limites d'utilisation sont dépassées.",
    ],
    jp: [
      'プロジェクトで必要なGemini API/クォータが有効になっているか確認してください。',
      '403はプロジェクトの権限や地域制限に関連することが多いです。',
      '429は使用制限を超えたことを意味します。',
    ],
    zh: ['确保为项目启用了所需的Gemini API/配额。', '403通常与项目权限或地区限制有关。', '429表示使用量超过限制。'],
  },
}
