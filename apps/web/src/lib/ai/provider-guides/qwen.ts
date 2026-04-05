import type { ProviderGuide } from './types'

export const qwen: ProviderGuide = {
  id: 'qwen',
  signupUrl: 'https://www.alibabacloud.com/help/en/model-studio/first-api-call-to-qwen',
  keyConsoleUrl: 'https://modelstudio.console.alibabacloud.com/?tab=playground#/api-key',
  docsUrl: 'https://www.alibabacloud.com/help/model-studio/get-api-key',
  steps: {
    en: [
      'Log in to Alibaba Cloud Model Studio and select the required region in the top-right corner.',
      'Open the API Key page and click Create API Key.',
      'Select a workspace (usually default), create the key and copy it immediately.',
      'Add the key to Oryxel as Qwen. If you get 401/403, check that the region and endpoint match.',
    ],
    ru: [
      'Войдите в Alibaba Cloud Model Studio и выберите нужный регион в правом верхнем углу.',
      'Откройте API Key page и нажмите Create API Key.',
      'Выберите workspace (обычно default), создайте ключ и сразу скопируйте его.',
      'Добавьте ключ в Oryxel как Qwen. Если есть 401/403, проверьте соответствие региона и endpoint.',
    ],
    es: [
      'Inicia sesión en Alibaba Cloud Model Studio y selecciona la región requerida en la esquina superior derecha.',
      'Abre la página API Key y haz clic en Create API Key.',
      'Selecciona un workspace (normalmente default), crea la clave y cópiala de inmediato.',
      'Añade la clave en Oryxel como Qwen. Si obtienes 401/403, verifica que la región y el endpoint coincidan.',
    ],
    fr: [
      'Connectez-vous à Alibaba Cloud Model Studio et sélectionnez la région requise en haut à droite.',
      'Ouvrez la page API Key et cliquez sur Create API Key.',
      'Sélectionnez un workspace (généralement default), créez la clé et copiez-la immédiatement.',
      "Ajoutez la clé dans Oryxel comme Qwen. En cas de 401/403, vérifiez que la région et l'endpoint correspondent.",
    ],
    jp: [
      'Alibaba Cloud Model Studioにログインして右上で必要なリージョンを選択。',
      'API KeyページでCreate API Keyをクリック。',
      'ワークスペース（通常はdefault）を選択してキーを作成し、すぐにコピー。',
      'OryxelにQwenとしてキーを追加。401/403が出た場合はリージョンとエンドポイントの一致を確認。',
    ],
    zh: [
      '登录阿里云Model Studio，在右上角选择所需地区。',
      '打开API Key页面，点击Create API Key。',
      '选择工作区（通常为default），创建密钥并立即复制。',
      '将密钥作为Qwen添加到Oryxel。如出现401/403，检查地区和endpoint是否匹配。',
    ],
  },
  notes: {
    en: [
      "The key's region must match the endpoint region (a common cause of errors).",
      '401 — invalid key or region/endpoint mismatch.',
      '429 — limits/quotas. Check Free Trial and Billing in Alibaba Cloud.',
    ],
    ru: [
      'Ключ региона должен совпадать с endpoint региона (частая причина ошибок).',
      '401 — неверный ключ или mismatch регион/endpoint.',
      '429 — лимиты/квоты. Проверьте Free Trial и Billing в Alibaba Cloud.',
    ],
    es: [
      'La región de la clave debe coincidir con la región del endpoint (causa frecuente de errores).',
      '401 — clave inválida o discrepancia región/endpoint.',
      '429 — límites/cuotas. Revisa Free Trial y Billing en Alibaba Cloud.',
    ],
    fr: [
      "La région de la clé doit correspondre à la région de l'endpoint (cause fréquente d'erreurs).",
      '401 — clé invalide ou non-correspondance région/endpoint.',
      '429 — limites/quotas. Vérifiez Free Trial et Billing dans Alibaba Cloud.',
    ],
    jp: [
      'キーのリージョンはエンドポイントのリージョンと一致している必要があります（エラーのよくある原因）。',
      '401 — 無効なキーまたはリージョン/エンドポイントの不一致。',
      '429 — 制限/クォータ。Alibaba CloudのFree TrialとBillingを確認。',
    ],
    zh: [
      '密钥地区必须与endpoint地区匹配（常见错误原因）。',
      '401 — 密钥无效或地区/endpoint不匹配。',
      '429 — 限制/配额。检查阿里云的免费试用和计费。',
    ],
  },
}
