export type ProviderGuideId = 'openai' | 'anthropic' | 'gemini' | 'qwen' | 'perplexity' | 'groq' | 'deepseek'

export type ProviderGuide = {
  id: ProviderGuideId
  signupUrl: string
  keyConsoleUrl: string
  docsUrl: string
  steps: Record<string, string[]>
  notes: Record<string, string[]>
}

export const PROVIDER_GUIDES: Record<ProviderGuideId, ProviderGuide> = {
  groq: {
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
  },
  deepseek: {
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
  },
  openai: {
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
  },
  anthropic: {
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
  },
  gemini: {
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
  },
  qwen: {
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
  },
  perplexity: {
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
  },
}

export function getProviderGuideLocalized(id: ProviderGuideId, locale: string): { steps: string[]; notes: string[] } {
  const guide = PROVIDER_GUIDES[id]
  const lang = locale in guide.steps ? locale : 'en'

  return { steps: guide.steps[lang] ?? guide.steps['en'], notes: guide.notes[lang] ?? guide.notes['en'] }
}
