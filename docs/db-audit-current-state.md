# Database Audit State

## Current Architecture

- `packages/db/src/schema.ts` and `packages/db/src/auth.schema.ts` are the authoritative app and Better Auth schemas.
- `packages/db/src/index.ts` uses postgres.js and serves web, worker, and gateway through `@oryxel/db`.
- Railway PostgreSQL is the production app database. PostgreSQL is authoritative for sessions, jobs, user data, and migration state.
- `packages/catalog-db` owns the separate canonical catalog ingestion schema; its URL is not a general runtime dependency.

## Migration Contract

- App migrations are append-only under `packages/db/drizzle`; `checksums.json` and `_journal.json` define the immutable manifest.
- Migration `0011_user_catalog_owner_scope` replaces global user-identity uniqueness with partial global-canonical and per-owner indexes.
- Production services require the complete contiguous migration history with matching checksums before `/readyz` succeeds.
- CI applies the app migration history twice to a fresh PostgreSQL service and validates both migration manifests.
- `db:push` is local-development tooling only. Production changes use `db:migrate`.

## Privacy And Ownership

- Canonical `legacy/catalog` brands and fragrances are globally visible and unique.
- `user` identities are unique per owner. Lookup and search include only canonical rows or rows owned by the current viewer.
- Account deletion removes unreferenced user identities, then clears ownership on referenced survivors while preserving `origin='user'`; detached rows are not exposed by search.

## Cutover Gate

`packages/db/src/verify-migration.ts` rejects a cutover unless source and destination have distinct PostgreSQL identity, matching migration tags/checksums, matching sequence ownership/value, expected table sets, non-volatile content parity, and exact production readiness. See [Database Cutover](db-cutover.md) for the write-boundary rollback procedure.
