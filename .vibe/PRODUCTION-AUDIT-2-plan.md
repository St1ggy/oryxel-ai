# Production Audit 2

## Task

Закрыть оставшиеся production-блокеры после первого аудита: сделать PostgreSQL единственным источником истины для сессий, обеспечить фактическое применение platform AI grants, исключить потерю notification jobs, восстановить завершение SSE при потерянной Redis-публикации и запретить готовность сервисов при неполной схеме или обязательной production-конфигурации.

Завершить privacy-изоляцию пользовательского каталога, усилить cutover-проверки и rollback-процедуру, добавить CI-проверки реальных миграций и синхронизировать эксплуатационную документацию и архитектурные правила.

## Plan Structure

Этапы сгруппированы по блокам: немедленная локальная гигиена, authentication и AI access, очередь фоновых задач, Redis/SSE, schema readiness, catalog privacy, database cutover, CI/configuration и финальная документация.

## Execution Plan

### Stage 1: Зафиксировать audit baseline и локальную гигиену секретов

**What to add/implement:**

- Ограничить права локальных `.env*` и database dump до `0600`, не читая и не меняя их содержимое.
- Проверить, что секреты и дампы не отслеживаются Git.
- Зафиксировать необходимость внешней ротации production credentials в tracker notes без сохранения значений.

**Files to edit/create:**

- `.vibe/PRODUCTION-AUDIT-2-plan-track.md` - отметить локальные действия и внешний rotation blocker.

**Verification commands:**

- `git ls-files '.env*' '*.dump' '*.sql.gz'`
- `stat -f '%Sp %N' .env.development .env.production neon-20260707-1547.dump`

### Stage 2: Сделать Better Auth sessions database-only

**What to add/implement:**

- Удалить Better Auth `secondaryStorage`, чтобы session lookup и revoke не зависели от Redis cache entries.
- Добавить отдельный Redis `rateLimit.customStorage` с атомарным `consume`, не используемый для auth sessions или verification records.
- Оставить custom API rate limiter независимым от Better Auth rate limiter.

**Files to edit/create:**

- `apps/web/src/lib/server/auth.ts` - подключить custom rate-limit storage без `secondaryStorage`.
- `apps/web/src/lib/server/rate-limit.ts` - заменить auth secondary storage на Better Auth rate-limit storage.

**Framework/Library Documentation:**

- `https://www.better-auth.com/docs/concepts/session-management` - database session storage semantics.
- `https://www.better-auth.com/docs/concepts/rate-limit` - atomic custom rate-limit storage.

**Examples in existing code:**

- `apps/web/src/lib/server/rate-limit.ts` - существующий Redis Lua increment with TTL.
- `packages/ai/src/account/privacy.ts` - transactional account deletion.

**Verification commands:**

- `bun run --cwd apps/web check`
- `bun run --cwd apps/web lint`

### Stage 3: Добавить regression tests для database-only sessions

**What to add/implement:**

- Проверить атомарное решение Better Auth rate-limit storage и отсутствие session storage methods.
- Добавить configuration regression test, запрещающий повторное подключение Better Auth `secondaryStorage`.
- Проверить, что account deletion удаляет database session records.

**Files to edit/create:**

- `apps/web/src/lib/server/rate-limit.test.ts` - тесты custom auth rate-limit storage.
- `apps/web/src/lib/server/auth-config.test.ts` - regression test auth storage configuration.
- `packages/ai/src/account/privacy.test.ts` - session deletion assertion.

**Verification commands:**

- `bun run --cwd apps/web test:unit -- --run`
- `bun run --cwd packages/ai test`

### Stage 4: Применить platform AI grants и revocations

**What to add/implement:**

- Читать `user_ai_preferences.platform_access` до добавления platform candidate.
- Не ограничивать user-owned и provider-specific environment keys флагом platform access.
- Согласовать `hasEffectiveProviderAccess`, configured providers и worker candidate resolution.

**Files to edit/create:**

- `apps/web/src/lib/server/ai/keys/service.ts` - применить platform access в web.
- `packages/ai/src/ai/keys/service.ts` - применить platform access в worker package.

**Examples in existing code:**

- `apps/web/src/routes/api/admin/platform-access/+server.ts` - grant/revoke endpoint.
- `packages/db/src/schema.ts` - `user_ai_preferences.platform_access`.

**Verification commands:**

- `bun run --cwd apps/web check`
- `bun run --cwd apps/worker check`

### Stage 5: Добавить tests для platform AI access

**What to add/implement:**

- Проверить состояния absent, granted и revoked для platform key.
- Проверить независимый доступ через user key и provider environment key.
- Проверить согласованность web и worker реализаций.

**Files to edit/create:**

- `apps/web/src/lib/server/ai/keys/service.test.ts` - web access matrix.
- `packages/ai/src/ai/keys/service.test.ts` - worker access matrix.

**Verification commands:**

- `bun run --cwd apps/web test:unit -- --run`
- `bun run --cwd packages/ai test`

### Stage 6: Исправить coalescing фоновых jobs

**What to add/implement:**

- Coalesce только refresh jobs `profile_sync` и `list_slice_sync`.
- Никогда не отменять pending event jobs `notify_post`, `notify_follow` и `notify_list`.
- Выполнять cancel-and-replace в одной transaction при вызове через top-level DB executor.

**Files to edit/create:**

- `packages/ai/src/ai/jobs.ts` - ограничить coalescing и сделать replacement атомарным.

**Examples in existing code:**

- `packages/ai/src/social/apply-list-ops.ts` - enqueue внутри существующей transaction.
- `apps/web/src/lib/server/ai/jobs.ts` - observed top-level enqueue.

**Verification commands:**

- `bun run --cwd apps/worker check`
- `bun run --cwd packages/ai lint`

### Stage 7: Добавить tests для job coalescing

**What to add/implement:**

- Проверить сохранение двух pending notification events одного типа.
- Проверить replacement refresh job в transaction.
- Проверить rollback cancellation при ошибке replacement insert.

**Files to edit/create:**

- `packages/ai/src/ai/jobs.test.ts` - enqueue/coalescing transaction tests.

**Verification commands:**

- `bun run --cwd packages/ai test`

### Stage 8: Устранить silent Redis/SSE degradation

**What to add/implement:**

- Требовать Redis в production readiness web и worker; fail-closed policy должна возвращать `503`, если client отсутствует.
- Добавить periodic PostgreSQL reconciliation для каждого активного nonterminal SSE stream и очистку timer при закрытии.
- Запретить production gateway CORS fallback `*`.
- Ограничить global и per-user active streams до создания отдельного Redis subscriber.

**Files to edit/create:**

- `apps/web/src/hooks.server.ts` - fail-closed behavior без Redis.
- `apps/web/src/routes/readyz/+server.ts` - production-required Redis check.
- `apps/worker/src/index.ts` - production-required Redis readiness.
- `apps/job-stream-gateway/src/index.ts` - reconciliation timer, strict CORS и stream limits.
- `apps/job-stream-gateway/src/stream-limiter.ts` - global/per-user stream accounting.
- `packages/runtime/src/environment.ts` - shared production detection and bounded integer parsing.

**Verification commands:**

- `bun run --cwd apps/web check`
- `bun run --cwd apps/worker check`
- `bun run --cwd apps/job-stream-gateway check`

### Stage 9: Добавить lifecycle tests для worker и gateway

**What to add/implement:**

- Добавить Vitest targets worker и gateway и включить их в root test script.
- Проверить production Redis requirements, periodic reconciliation, stream cap rejection и cleanup counters.
- Проверить web readiness и sensitive policy без Redis.

**Files to edit/create:**

- `apps/worker/package.json` - test script.
- `apps/job-stream-gateway/package.json` - test script.
- `apps/worker/src/index.test.ts` - worker readiness configuration tests.
- `apps/worker/src/runtime-config.ts` - testable production Redis validation.
- `apps/job-stream-gateway/src/index.test.ts` - stream lifecycle tests.
- `apps/job-stream-gateway/src/runtime-config.ts` - testable CORS and stream configuration.
- `apps/job-stream-gateway/src/reconciliation.ts` - testable periodic reconciliation lifecycle.
- `apps/web/src/lib/server/rate-limit.test.ts` - no-client policy tests.
- `apps/web/src/lib/server/readiness.test.ts` - required production Redis readiness tests.
- `package.json` - включить worker и gateway tests.

**Verification commands:**

- `bun run --cwd apps/worker test`
- `bun run --cwd apps/job-stream-gateway test`
- `bun run --cwd apps/web test:unit -- --run`

### Stage 10: Сделать readiness schema-aware

**What to add/implement:**

- Проверять полный contiguous migration ledger и checksum последней app migration вместо одного `SELECT 1`.
- Использовать один schema readiness check во всех трёх runtime services.
- Возвращать controlled failure без database URL или SQL error message.

**Files to edit/create:**

- `packages/db/src/index.ts` - migration-aware readiness.
- `packages/db/src/migrations.ts` - переиспользовать canonical migration metadata.
- `packages/db/src/migration-manifest.ts` - bundled journal/checksum manifest.
- `packages/db/src/migration-readiness.ts` - pure full-ledger validator.
- `apps/web/src/routes/readyz/+server.ts` - использовать schema readiness.
- `apps/worker/src/index.ts` - использовать schema readiness.
- `apps/job-stream-gateway/src/index.ts` - использовать schema readiness.

**Examples in existing code:**

- `packages/db/src/migrate.ts` - migration ledger validation rules.
- `packages/db/src/check-migrations.ts` - immutable local history validation.

**Verification commands:**

- `bun run --cwd packages/db typecheck`
- `bun run check`

### Stage 11: Добавить tests для schema readiness

**What to add/implement:**

- Проверить rejection неизвестной, неполной, non-contiguous и checksum-mismatched history.
- Проверить acceptance полной текущей history.

**Files to edit/create:**

- `packages/db/src/readiness.test.ts` - migration ledger matrix.

**Verification commands:**

- `bun run --cwd packages/db test`

### Stage 12: Завершить owner scope пользовательского каталога

**What to add/implement:**

- Заменить global uniqueness пользовательских brand/fragrance identities на partial canonical и per-user unique indexes.
- Ограничить find-or-create canonical rows или rows текущего пользователя.
- Ограничить fragrance search canonical rows и user-origin rows текущего viewer.
- Сохранить provenance при account deletion без orphan `origin='user'` rows.

**Files to edit/create:**

- `packages/db/src/schema.ts` - owner-scoped indexes and constraints.
- `packages/db/drizzle/0011_user_catalog_owner_scope.sql` - data migration and indexes.
- `packages/db/drizzle/meta/_journal.json` - migration journal entry.
- `packages/ai/src/diary/find-or-create.ts` - owner-aware lookup.
- `packages/ai/src/social/search.ts` - viewer-aware search.
- `apps/web/src/routes/api/search/fragrances/+server.ts` - передать viewer ID.
- `packages/ai/src/diary/catalog-lifecycle.ts` - provenance-safe cleanup.
- `packages/ai/src/account/privacy.ts` - detach ownership only after orphan cleanup during account deletion.

**Verification commands:**

- `bun run --cwd packages/db db:check`
- `bun run --cwd packages/db db:check-history`
- `bun run --cwd apps/worker check`
- `bun run --cwd apps/web check`

### Stage 13: Добавить tests для catalog privacy

**What to add/implement:**

- Проверить, что User B не видит user-origin identity User A.
- Проверить независимые одинаковые имена для двух пользователей.
- Проверить отсутствие unintended duplicates при conflict path.
- Проверить account deletion provenance cleanup.

**Files to edit/create:**

- `packages/ai/src/diary/find-or-create.test.ts` - owner lookup tests.
- `packages/ai/src/social/search.test.ts` - viewer visibility tests.
- `packages/ai/src/account/privacy.test.ts` - deletion provenance tests.

**Verification commands:**

- `bun run --cwd packages/ai test`

### Stage 14: Усилить database cutover и rollback

**What to add/implement:**

- Сравнивать migration ledger checksums, sequence ownership/value и database identity.
- Считать unexpected destination tables failure без explicit allowlist.
- Требовать production `/readyz` и exact ready status.
- Разделить rollback до destination writes и после acknowledged destination writes; после writes запретить простой возврат на stale source.

**Files to edit/create:**

- `packages/db/src/verify-migration.ts` - расширенные cutover gates.
- `docs/db-cutover.md` - безопасные rollback phases.

**Verification commands:**

- `bun run --cwd packages/db typecheck`
- `bun run --cwd packages/db lint`

### Stage 15: Добавить tests для cutover verifier

**What to add/implement:**

- Вынести pure comparison helpers и проверить sequence, migration, table и readiness failure cases.
- Проверить rejection одинаковой database identity при разных URL strings.

**Files to edit/create:**

- `packages/db/src/verify-migration.test.ts` - cutover comparison tests.
- `packages/db/package.json` - DB test script.

**Verification commands:**

- `bun run --cwd packages/db test`

### Stage 16: Укрепить CI и production configuration

**What to add/implement:**

- Удалить `db:push:prod` из root и DB package scripts.
- Выровнять Better Auth CLI и runtime versions и направить schema generation в authoritative package schema.
- Добавить PostgreSQL service в CI, fresh/repeat migration checks и trigger на pushes в `main`.
- Дополнить environment contract всеми используемыми OAuth и AI variables.

**Files to edit/create:**

- `package.json` - удалить production push script и включить новые tests.
- `packages/db/package.json` - удалить production push script.
- `apps/web/package.json` - выровнять Better Auth CLI и schema target.
- `.github/workflows/ci.yml` - PostgreSQL migration gate и push trigger.
- `.env.example` - полный environment contract.

**Verification commands:**

- `bun install --frozen-lockfile`
- `bun run check`
- `bun run test`

### Stage 17: Синхронизировать operations и архитектурные правила

**What to add/implement:**

- Обновить service model: PostgreSQL authoritative sessions, Redis custom/auth rate limits и notifications only.
- Обновить Railway-only provisioning, readiness, OAuth, AI grants и cutover procedures.
- Синхронизировать `CLAUDE.md`, `context.mdc` и `memory.mdc` для текущего postgres-js package DB layout.

**Files to edit/create:**

- `README.md` - актуальная architecture summary.
- `docs/operations.md` - runtime and deployment contract.
- `docs/db-audit-current-state.md` - current audit state.
- `CLAUDE.md` - актуальная architecture/memory copy.
- `.cursor/rules/context.mdc` - актуальная architecture contract.
- `.cursor/rules/memory.mdc` - новые архитектурные решения.

**Verification commands:**

- `bunx prettier --check README.md docs CLAUDE.md .cursor/rules .vibe`
- `git diff --check`

### Stage 18: Выполнить финальную production gate

**What to add/implement:**

- Запустить полный verify и проверить отсутствие незапланированных файлов.
- Обновить tracker всеми результатами, residual risks и внешними manual actions.
- Не создавать commit и не выполнять push без отдельного запроса пользователя.

**Files to edit/create:**

- `.vibe/PRODUCTION-AUDIT-2-plan-track.md` - завершить статусы и notes.

**Verification commands:**

- `bun run verify`
- `git diff --check`
- `git status --short --branch`
