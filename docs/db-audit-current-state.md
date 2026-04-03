# DB Audit: current state vs schema

## Scope

- Compared runtime schema in `src/lib/server/db/schema.ts` with generated migration `drizzle/0000_normal_jean_grey.sql`.
- Attempted schema generation and migration from the current workspace environment.

## Result

- Missing tables were identified and added to schema:
  - `ai_pending_patch`
  - `ai_patch_audit_log`
- Existing domain tables included in migration:
  - `task`, `brand`, `fragrance`, `user_profile`, `user_ai_preferences`, `user_fragrance`

## Local verification run

- Started local PostgreSQL (Docker/Colima) at `postgresql://oryxel:oryxel@127.0.0.1:54329/oryxel`.
- Applied migration with `DATABASE_URL=... bun run db:migrate` successfully.
- Verified physical tables in `information_schema.tables`:
  - `ai_patch_audit_log`
  - `ai_pending_patch`
  - `brand`
  - `fragrance`
  - `task`
  - `user_ai_preferences`
  - `user_fragrance`
  - `user_profile`
- Seeded minimal data with `DATABASE_URL=... SEED_USER_ID=dev-user bun run db:seed:minimal`.

## Environment caveat

- `bun run auth:schema` failed because the configured `DATABASE_URL` is a placeholder and not a valid Neon URL.
- `bun run db:migrate` failed in the same environment because DB connectivity is not available.

## Notes

- `bun run auth:schema` still depends on a valid Better Auth runtime DB context and can fail when env points to placeholder values.
