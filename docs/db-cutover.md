# Database Cutover

Use this runbook to move the application database between PostgreSQL providers. Keep the source database available and read-only until the safety window has elapsed.

## Preconditions

- Create and verify a restorable source backup.
- Provision the destination with encrypted storage and a public certificate-valid PostgreSQL endpoint.
- Stop application and worker writes before the final copy.
- Record source and destination connection URLs outside the repository.

## Apply Migrations

After writes are stopped and the final copy is complete, run the append-only migration history against the destination:

```bash
DATABASE_URL="postgresql://..." bun run --cwd packages/db db:migrate
```

The runner serializes concurrent deploys with a PostgreSQL advisory lock and rejects unknown, non-contiguous, or checksum-mismatched history.

For a legacy database created by `drizzle-kit push`, inspect its schema first and explicitly adopt only the migrations already represented by that schema:

```bash
DATABASE_URL="postgresql://..." \
DATABASE_MIGRATION_BASELINE="0006_social_layer" \
bun run --cwd packages/db db:migrate
```

Remove `DATABASE_MIGRATION_BASELINE` immediately after the one-time adoption. Never use it to skip an unapplied migration.

## Apply Locking Migrations

Migrations that add foreign keys or build regular indexes, including `0009_account_data_cascades`, require a maintenance window. The migration transaction holds table locks until commit; the migration advisory lock only serializes other migration runners and does not stop application writes.

- Put the web application into maintenance mode before running the migration.
- Stop the worker and wait for the current job to finish.
- Run `DATABASE_URL="postgresql://..." bun run --cwd packages/db db:migrate` against the destination.
- Treat a lock-timeout or deadlock error as an aborted migration, keep writes disabled, and rerun it after confirming no application connections are writing.

## Verify Cutover

After the final data copy and before restoring writes, compare schemas and order-independent content fingerprints:

```bash
NEON_URL="postgresql://..." \
RAILWAY_URL="postgresql://..." \
PROD_URL="https://oryxel.ai" \
bun packages/db/src/verify-migration.ts
```

Treat any failure as a rollback condition. Review warnings manually, especially worker inactivity and expected post-cutover drift in volatile authentication tables.

Restore web and worker traffic only after the migration and verification both succeed.

## Safety Window

- Switch the application and workers to the destination together.
- Keep the source database read-only for 24-48 hours.
- Monitor application errors, failed jobs, connection saturation, and destination backups.
- Roll back connection variables to the source if parity or runtime checks fail.
- Delete the source only after the safety window, a fresh destination backup, and a restore test all succeed.
