# Progress tracker for PRODUCTION-AUDIT-2-plan.md

Status format: [ ] - not processed, [X] - completed

## Execution Stages

[X] Stage 1: Зафиксировать audit baseline и локальную гигиену секретов
[X] Stage 2: Сделать Better Auth sessions database-only
[X] Stage 3: Добавить regression tests для database-only sessions
[X] Stage 4: Применить platform AI grants и revocations
[X] Stage 5: Добавить tests для platform AI access
[X] Stage 6: Исправить coalescing фоновых jobs
[X] Stage 7: Добавить tests для job coalescing
[X] Stage 8: Устранить silent Redis/SSE degradation
[X] Stage 9: Добавить lifecycle tests для worker и gateway
[X] Stage 10: Сделать readiness schema-aware
[X] Stage 11: Добавить tests для schema readiness
[X] Stage 12: Завершить owner scope пользовательского каталога
[X] Stage 13: Добавить tests для catalog privacy
[X] Stage 14: Усилить database cutover и rollback
[X] Stage 15: Добавить tests для cutover verifier
[X] Stage 16: Укрепить CI и production configuration
[X] Stage 17: Синхронизировать operations и архитектурные правила
[X] Stage 18: Выполнить финальную production gate

## Notes

- 2026-08-31: Локальная `main` находится ahead 16 относительно tracking ref; remote и deployed SHA не проверены.
- 2026-08-31: Production credentials и database dump требуют внешней ротации/переноса в secret storage; значения не читаются и не сохраняются в tracker.
- 2026-08-31: Права `.env`, `.env.development`, `.env.production` и локального database dump ограничены до `0600`; Git отслеживает только `.env.example`.
- 2026-08-31: Better Auth больше не получает `secondaryStorage`; Redis используется отдельным atomic `rateLimit.customStorage`, а sessions остаются database-only. Web check/lint и 62 unit tests прошли.
- 2026-08-31: Platform AI key доступен только при `platform_access=true` в web и worker; user/env keys не зависят от grant. Прошли 66 web и 70 AI tests.
- 2026-08-31: Coalescing ограничен `profile_sync` и `list_slice_sync`; notification events не отменяют друг друга, а top-level enqueue выполняется transactionally. Прошли worker check и 73 AI tests.
- 2026-08-31: Production web/worker fail closed без Redis, gateway требует exact CORS origin, ограничивает concurrent streams и периодически reconciles PostgreSQL state. Web, worker, gateway и runtime check/lint прошли.
- 2026-08-31: Добавлены worker/gateway Vitest targets и tests production Redis/CORS, reconciliation cleanup, stream counters, web readiness и no-client policy. Root test прошёл: AI 73, runtime 16, worker 3, gateway 4, web 70 и Playwright 3.
- 2026-08-31: Все runtime services используют schema-aware database readiness по bundled journal/checksum manifest. Validator требует полную contiguous history без unknown/checksum mismatch; root check и 6 DB readiness tests прошли.
- 2026-08-31: Catalog identities разделены partial indexes на global canonical и per-owner user scope; lookup/search ограничены canonical + viewer-owned rows, account deletion очищает orphans и detach owner без публикации provenance. DB migration checks, web/worker checks и 75 AI tests прошли.
- 2026-08-31: Cutover verifier требует distinct PostgreSQL identity, ledger/checksum и sequence parity, explicit destination table allowlist и exact production readiness; runbook разделяет rollback до/после destination writes. DB typecheck/lint и 11 tests прошли.
- 2026-08-31: CI запускается на PR/main push и дважды применяет migrations к fresh PostgreSQL; production db:push удалён, Better Auth 1.7 CLI пишет authoritative package schema, env contract дополнен OAuth/AI/stream/cutover variables. Frozen install, root check и root test прошли.
- 2026-08-31: README, operations, database audit и Cursor/Claude rules синхронизированы с Railway PostgreSQL/Redis topology, database-only sessions, schema-aware readiness и owner-scoped catalog.
- 2026-08-31: Финальный `bun run verify` прошёл: lint, checks, migration history, 179 unit tests, 3 Playwright tests и production builds web/worker/gateway. Осталось выполнить external credential rotation и deployment cutover runbook.
- 2026-09-01: Пошаговая production deployment/cutover инструкция сохранена в `.vibe/PRODUCTION-AUDIT-2-deployment-runbook.md`.
- Commit и push не входят в выполнение без отдельного запроса пользователя.
