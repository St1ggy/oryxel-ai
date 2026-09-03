# Production Deployment And Database Cutover Runbook

Эта инструкция переводит текущую production-среду Oryxel на Vercel web и Railway PostgreSQL, Redis, worker и job-stream gateway. Основной сценарий предполагает перенос существующей PostgreSQL-базы на Railway. Для первой установки без production-данных используется сокращённый шаг 6.

## 0. Неизменяемые правила

- Не сохранять URL баз, токены и секреты в репозитории, shell history, CI logs, tickets или этот runbook.
- Не использовать `db:push` для shared или production databases.
- Не использовать `DATABASE_MIGRATION_BASELINE` для новой Railway database.
- Не менять и не удалять уже применённые migration files.
- Не передавать Vercel адреса `*.railway.internal`; Vercel использует только Railway public URLs.
- Не запускать worker на destination database до успешного restore, migrations и cutover verification.
- Сохранять source database доступной, но read-only, минимум 24-48 часов после cutover.
- После первой подтверждённой записи в destination database не возвращать сервисы на устаревшую source database.

## 1. Подготовить release

1. Закоммитить audit changes в отдельную branch и отправить её в remote repository.
2. Дождаться успешного GitHub CI, включая PostgreSQL fresh/repeat migration gate.
3. В корне чистого checkout выполнить:

```bash
bun install --frozen-lockfile
bun run verify
git diff --check
git status --short --branch
git rev-parse HEAD
```

4. Записать commit SHA, дату, текущие Vercel/Railway deployment IDs и ответственного за cutover в закрытый operational record.
5. Зафиксировать финальные публичные origins без trailing slash:

```text
WEB_ORIGIN=https://oryxel.ai
GATEWAY_ORIGIN=https://<gateway-domain>
```

6. Подготовить локальные operator variables через password manager или временную shell session:

```text
SOURCE_DATABASE_URL
DESTINATION_DATABASE_URL
REDIS_PUBLIC_URL
WEB_ORIGIN
GATEWAY_ORIGIN
```

Не записывать реальные значения в `.env.example` или `.vibe`.

## 2. Подготовить и ротировать secrets

1. Для новой среды сгенерировать отдельные значения. Каждую команду запускать отдельно и сразу сохранять результат в password manager:

```bash
openssl rand -base64 48
openssl rand -base64 48
openssl rand -base64 48
openssl rand -base64 32
```

2. Назначить первые три значения соответственно:

```text
BETTER_AUTH_SECRET
JOB_STREAM_JWT_SECRET
ADMIN_SECRET
```

3. Назначить четвёртое значение `AI_KEYS_ENCRYPTION_KEY`. Оно должно быть valid base64 и декодироваться ровно в 32 bytes.
4. Если source database уже содержит encrypted user provider keys, не заменять текущий `AI_KEYS_ENCRYPTION_KEY` без отдельной re-encryption migration. Перенести его через password manager и запланировать ротацию отдельно.
5. Учесть последствия coordinated rotation:

| Secret                   | Последствие ротации                                                      |
| ------------------------ | ------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`     | Существующие auth sessions могут потребовать повторный вход              |
| `JOB_STREAM_JWT_SECRET`  | Web и gateway должны получить одно значение в одном maintenance window   |
| `AI_KEYS_ENCRYPTION_KEY` | Старые encrypted provider keys перестанут расшифровываться без migration |
| `ADMIN_SECRET`           | Старый administrative credential должен быть немедленно отозван          |

6. Подготовить OAuth client IDs/secrets только для реально включаемых providers.
7. Подготовить AI provider keys/models или пару `PLATFORM_AI_PROVIDER` + `PLATFORM_AI_KEY`. Platform key становится доступен пользователю только после `platform_access=true`.

## 3. Создать Railway infrastructure

1. Создать один Railway project в выбранном production region.
2. Добавить managed PostgreSQL service с именем `Postgres`.
3. Добавить managed Redis service с именем `Redis` в том же region.
4. Включить PostgreSQL backups и проверить, что доступно создание manual backup/restore target.
5. Сохранить вне репозитория:

```text
Postgres.DATABASE_URL
Postgres.DATABASE_PUBLIC_URL
Redis.REDIS_URL
Redis.REDIS_PUBLIC_URL
```

6. Использовать private URLs только внутри Railway:

```dotenv
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

7. Использовать public URLs для Vercel и operator migration commands:

```text
Vercel DATABASE_URL = Postgres.DATABASE_PUBLIC_URL
Vercel REDIS_URL    = Redis.REDIS_PUBLIC_URL
```

8. Не задавать `PORT`: Railway инжектирует его автоматически.

## 4. Создать Railway runtime services

### 4.1 Worker

1. Создать service из того же Git repository.
2. Оставить Root Directory пустой или `.`.
3. В Config as Code указать абсолютный repository path:

```text
/apps/worker/railway.toml
```

4. Проверить resolved configuration:

```text
Builder: RAILPACK
Build: bun install --frozen-lockfile && bun run --cwd apps/worker build
Start: bun apps/worker/dist/index.js
Health check: /readyz
Health timeout: 30 seconds
```

5. Добавить variables:

| Variable                 | Value                                                  |
| ------------------------ | ------------------------------------------------------ |
| `DATABASE_URL`           | `${{Postgres.DATABASE_URL}}`                           |
| `REDIS_URL`              | `${{Redis.REDIS_URL}}`                                 |
| `AI_KEYS_ENCRYPTION_KEY` | То же значение, что у web                              |
| `HEALTHCHECK_TIMEOUT_MS` | `2000`                                                 |
| AI provider variables    | Нужные `*_API_KEY`, `*_MODEL`, router limits/order     |
| Platform AI variables    | Опциональные `PLATFORM_AI_PROVIDER`, `PLATFORM_AI_KEY` |

6. Остановить или suspend service до шага 8. Worker не должен писать в destination раньше cutover boundary.
7. Public domain для worker не создавать.

### 4.2 Job-stream gateway

1. Создать второй service из того же Git repository.
2. Оставить Root Directory пустой или `.`.
3. В Config as Code указать:

```text
/apps/job-stream-gateway/railway.toml
```

4. Проверить resolved configuration:

```text
Builder: RAILPACK
Build: bun install --frozen-lockfile && bun run --cwd apps/job-stream-gateway build
Start: bun apps/job-stream-gateway/dist/index.js
Health check: /readyz
Health timeout: 30 seconds
```

5. Добавить variables:

| Variable                       | Value                        |
| ------------------------------ | ---------------------------- |
| `DATABASE_URL`                 | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL`                    | `${{Redis.REDIS_URL}}`       |
| `JOB_STREAM_JWT_SECRET`        | То же значение, что у web    |
| `STREAM_CORS_ORIGIN`           | Exact `WEB_ORIGIN`           |
| `STREAM_RECONCILE_INTERVAL_MS` | `5000`                       |
| `MAX_ACTIVE_STREAMS`           | `200`                        |
| `MAX_ACTIVE_STREAMS_PER_USER`  | `5`                          |
| `HEALTHCHECK_TIMEOUT_MS`       | `2000`                       |

6. Создать Railway public HTTPS domain и сохранить его как `GATEWAY_ORIGIN` без trailing slash.
7. Пока destination database не восстановлена, failed `/readyz` является ожидаемым и не должен обходиться заменой health check на `/healthz`.

## 5. Создать Vercel web project

1. Import Git repository в новый Vercel project.
2. Установить Root Directory:

```text
apps/web
```

3. Проверить, что `Include source files outside of the Root Directory in the Build Step` включён. Это требуется для `packages/*`, root `package.json` и `bun.lock`.
4. Выбрать Framework Preset `SvelteKit`.
5. Установить Install Command:

```bash
cd ../.. && bun install --frozen-lockfile
```

6. Установить Build Command:

```bash
bunx vite build
```

Не использовать в Vercel `bun run build`: локальный script намеренно читает untracked `../../.env.production`, которого нет в Git. Vercel variables уже доступны процессу build/runtime.

7. Не задавать Output Directory вручную; `@sveltejs/adapter-vercel` создаёт Vercel output.
8. Выбрать Vercel Function region рядом с Railway PostgreSQL region.
9. Назначить final custom domain и сохранить exact HTTPS origin как `WEB_ORIGIN`.
10. Добавить Production variables:

| Variable                 | Production value                            |
| ------------------------ | ------------------------------------------- |
| `DATABASE_URL`           | Railway `Postgres.DATABASE_PUBLIC_URL`      |
| `REDIS_URL`              | Railway `Redis.REDIS_PUBLIC_URL`            |
| `ORIGIN`                 | Exact `WEB_ORIGIN`                          |
| `BETTER_AUTH_SECRET`     | Production secret                           |
| `ADMIN_SECRET`           | Production secret                           |
| `AI_KEYS_ENCRYPTION_KEY` | Тот же ключ, что у worker                   |
| `JOB_STREAM_JWT_SECRET`  | Тот же secret, что у gateway                |
| `PUBLIC_JOB_STREAM_URL`  | Exact `GATEWAY_ORIGIN`, без trailing slash  |
| `HEALTHCHECK_TIMEOUT_MS` | `2000`                                      |
| `MAINTENANCE_MODE`       | `true` для cutover deployment               |
| OAuth variables          | Client ID/secret pairs включённых providers |
| AI provider variables    | Нужные keys, models, router limits/order    |
| Platform AI variables    | Опциональные provider/key                   |

11. Production credentials не добавлять в Preview scope. Для Preview использовать отдельные PostgreSQL/Redis/secrets и стабильный preview origin либо отключить stateful preview deployment.
12. После любого изменения `PUBLIC_JOB_STREAM_URL` обязательно создать новый deployment: значение читается client bundle во время build.

## 6. Инициализировать пустую production database

Этот шаг используется только если нет существующей production database с пользовательскими данными. При provider migration перейти к шагу 7.

1. Применить app migrations к Railway public URL:

```bash
DATABASE_URL="$DESTINATION_DATABASE_URL" bun packages/db/src/migrate.ts
```

2. Проверить immutable history:

```bash
bun run --cwd packages/db db:check
bun run --cwd packages/db db:check-history
```

3. Если нужен отдельный ingestion catalog database, создать отдельный Railway PostgreSQL service и выполнить:

```bash
CATALOG_DATABASE_URL="$CATALOG_DATABASE_URL" bun packages/catalog-db/src/migrate.ts
```

`CATALOG_DATABASE_URL` не добавлять в web, worker или gateway runtime.

4. Перейти к шагу 8. Source/destination parity verifier для первой пустой установки не запускается.

## 7. Перенести существующую PostgreSQL database

### 7.1 До maintenance window

1. Создать restorable source backup средствами текущего provider.
2. Выполнить test restore этого backup в отдельную временную database.
3. Проверить локальную immutable migration history:

```bash
bun run --cwd packages/db db:check
bun run --cwd packages/db db:check-history
```

Remote migration runner проверит source ledger и применит pending migrations после остановки writes. Locking migrations `0009`, `0010` и `0011` не применять к работающей source database заранее.

4. Убедиться, что destination Railway database новая и не содержит другого app schema или данных.
5. Подготовить custom-format dump path вне repository:

```bash
umask 077
DUMP_FILE="${TMPDIR:-/tmp}/oryxel-cutover-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

### 7.2 Остановить writes

1. В Vercel Production установить `MAINTENANCE_MODE=true` и redeploy текущий web, пока он ещё подключён к source database.
2. Проверить:

```bash
curl --fail-with-body --silent --show-error "$WEB_ORIGIN/healthz"
curl --silent --output /dev/null --write-out '%{http_code}\n' "$WEB_ORIGIN/diary"
```

Обычный protected/non-health request должен получить `503`; `/healthz` должен остаться доступным.

3. Gracefully stop текущий production worker.
4. Дождаться завершения активных jobs. Не переводить failed/processing rows вручную в `pending`.
5. Убедиться, что target Railway worker также остановлен.
6. Записать UTC timestamp остановки writes:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

### 7.3 Применить locking migrations и скопировать данные

1. С writes disabled применить текущую app history к source:

```bash
DATABASE_URL="$SOURCE_DATABASE_URL" bun packages/db/src/migrate.ts
```

2. Создать финальный source dump:

```bash
pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --dbname "$SOURCE_DATABASE_URL" \
  --file "$DUMP_FILE"
```

3. Проверить, что dump читается:

```bash
pg_restore --list "$DUMP_FILE" >/dev/null
chmod 600 "$DUMP_FILE"
```

4. Restore выполнять только в свежую empty destination database:

```bash
pg_restore \
  --exit-on-error \
  --no-owner \
  --no-acl \
  --dbname "$DESTINATION_DATABASE_URL" \
  "$DUMP_FILE"
```

5. Запустить migration runner на destination. При полном dump это должно быть validation/no-op либо применение только отсутствующих current migrations:

```bash
DATABASE_URL="$DESTINATION_DATABASE_URL" bun packages/db/src/migrate.ts
```

6. При любой ошибке оставить writes выключенными, не запускать worker и исправить restore/migration до продолжения.

### 7.4 Переключить read-only runtime и проверить parity

1. В gateway оставить `DATABASE_URL=${{Postgres.DATABASE_URL}}`, deploy service и дождаться `/readyz=200`.
2. В Vercel Production заменить `DATABASE_URL` и `REDIS_URL` на Railway public URLs, оставить `MAINTENANCE_MODE=true` и redeploy web.
3. Проверить readiness:

```bash
curl --fail-with-body --silent --show-error "$GATEWAY_ORIGIN/healthz"
curl --fail-with-body --silent --show-error "$GATEWAY_ORIGIN/readyz"
curl --fail-with-body --silent --show-error "$WEB_ORIGIN/healthz"
curl --fail-with-body --silent --show-error "$WEB_ORIGIN/readyz"
```

4. Проверить web JSON строго:

```bash
curl --fail-with-body --silent --show-error "$WEB_ORIGIN/readyz" | \
  jq -e '.status == "ready" and .checks.database.status == "ok" and .checks.redis.status == "ok"'
```

5. Запустить full cutover verifier:

```bash
SOURCE_DATABASE_URL="$SOURCE_DATABASE_URL" \
DESTINATION_DATABASE_URL="$DESTINATION_DATABASE_URL" \
PROD_URL="$WEB_ORIGIN" \
bun run --cwd packages/db db:verify-migration
```

6. Не добавлять `DESTINATION_EXTRA_TABLE_ALLOWLIST`, пока reviewed transition действительно не создаёт известную destination-only table.
7. Любая verifier failure до destination writes означает rollback к source по шагу 10.1.

## 8. Открыть production traffic

1. Убедиться, что web и gateway readiness успешны, а target worker всё ещё остановлен.
2. Зафиксировать отдельный UTC timestamp `destination write boundary` непосредственно перед запуском worker/снятием maintenance:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

С этого момента source считается stale, даже если точная первая запись ещё не найдена.

3. Запустить Railway worker с destination private `DATABASE_URL` и `REDIS_URL`.
4. Дождаться успешного Railway `/readyz` health check.
5. В Vercel Production установить `MAINTENANCE_MODE=false` и создать новый deployment.
6. Дождаться promotion production deployment и проверить все readiness endpoints повторно.

## 9. Выполнить product smoke test

1. Открыть public home page в private browser session.
2. Выполнить вход через один включённый OAuth provider.
3. Проверить обычный authenticated API read.
4. Создать действие, которое enqueue background job.
5. Дождаться terminal job state и SSE update; при SSE failure проверить HTTP polling fallback.
6. По `jobId` подтвердить structured events:

```text
job.enqueued
job.processing.started
job.processing.finished
stream.opened
stream.closed
```

7. Проверить user catalog isolation двумя test accounts: user-origin fragrance первого пользователя не должна появляться в search второго.
8. Если используется platform AI key, выдать test user `platform_access=true`, выполнить AI request, затем revoke access и подтвердить немедленное прекращение platform access.
9. Проверить, что logs не содержат tokens, request body/query, user IDs, stack traces или raw provider/database errors.

## 10. Rollback

### 10.1 До destination write boundary

1. Оставить или вернуть `MAINTENANCE_MODE=true`.
2. Остановить Railway worker.
3. Вернуть web, worker и gateway `DATABASE_URL` на frozen source database.
4. Вернуть previous Redis/config values при необходимости.
5. Redeploy gateway и web; worker запускать последним.
6. Потребовать exact `/readyz` success и повторить product smoke test.
7. Снять maintenance только после успешной проверки source runtime.

### 10.2 После destination write boundary

1. Не переключать сервисы обратно на source database.
2. Установить `MAINTENANCE_MODE=true` и redeploy web.
3. Остановить worker и сохранить обе databases, backups, deployment logs и boundary timestamp.
4. Выполнить forward repair на destination.
5. Если forward repair невозможен, подготовить отдельную reverse migration или restore с reconciliation всех destination writes после boundary.
6. Возобновлять traffic только после повторного migration, sequence, table, readiness и product smoke gate.

### 10.3 Только service/config regression

1. Если schema/data корректны и проблема только в code/config, откатить gateway/worker к recorded Railway deployments.
2. Promote last known-good Vercel deployment.
3. Не откатывать applied migrations; использовать backward-compatible code или forward fix.

## 11. Закрыть safety window

1. Оставить source database read-only на 24-48 часов.
2. Наблюдать web/gateway/worker readiness, failed jobs, database connections, Redis errors и rate-limit availability.
3. Создать новый destination backup после cutover.
4. Выполнить test restore destination backup в отдельную database.
5. После успешного safety window отозвать старые source database credentials и удалить временный local dump.
6. Source service удалять только после отдельного подтверждения owner и проверки retention requirements.
7. Записать финальные deployment IDs, release SHA, backup IDs, write boundary и smoke-test result в operational record без secret values.

## 12. OAuth callback checklist

Для каждого включённого provider зарегистрировать exact callback:

```text
<WEB_ORIGIN>/api/auth/callback/google
<WEB_ORIGIN>/api/auth/callback/apple
<WEB_ORIGIN>/api/auth/callback/facebook
<WEB_ORIGIN>/api/auth/callback/vk
<WEB_ORIGIN>/api/auth/callback/wechat
<WEB_ORIGIN>/api/auth/callback/yandex
```

Использовать только callbacks тех providers, для которых заданы обе переменные `*_CLIENT_ID` и `*_CLIENT_SECRET`. `ORIGIN` должен точно совпадать с production origin, включая `https`, без path и trailing slash.

## 13. Final acceptance checklist

- [ ] Release commit pushed; GitHub CI green.
- [ ] `bun run verify` green на release SHA.
- [ ] Production credentials сохранены только в provider secret stores/password manager.
- [ ] Railway PostgreSQL backups enabled и restore проверен.
- [ ] Worker и gateway используют Railway private PostgreSQL/Redis references.
- [ ] Vercel использует Railway public PostgreSQL/Redis URLs.
- [ ] Web/gateway имеют одинаковый `JOB_STREAM_JWT_SECRET`.
- [ ] Web/worker имеют одинаковый `AI_KEYS_ENCRYPTION_KEY`.
- [ ] `ORIGIN` и `STREAM_CORS_ORIGIN` равны exact final web origin.
- [ ] `PUBLIC_JOB_STREAM_URL` равен exact public gateway origin.
- [ ] OAuth callbacks обновлены.
- [ ] App migrations и immutable history checks прошли.
- [ ] Для provider migration full cutover verifier прошёл.
- [ ] Web, worker и gateway `/readyz` green.
- [ ] OAuth, API read, background job, SSE/polling и catalog privacy smoke tests прошли.
- [ ] Destination write boundary записан.
- [ ] Source database оставлена read-only на safety window.
- [ ] Post-cutover destination backup и restore test выполнены.

## References

- `docs/operations.md`
- `docs/db-cutover.md`
- `.env.example`
- `apps/worker/railway.toml`
- `apps/job-stream-gateway/railway.toml`
- [Vercel monorepos](https://vercel.com/docs/monorepos)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel promotion](https://vercel.com/docs/deployments/promote-preview-to-production)
- [Railway monorepos](https://docs.railway.com/guides/monorepo)
- [Railway config as code](https://docs.railway.com/reference/config-as-code)
- [Better Auth social providers](https://www.better-auth.com/docs/authentication/social-sign-on)
