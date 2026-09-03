# Database Cutover

Use this runbook to move the application database between PostgreSQL providers. Keep the source database available and read-only until the safety window has elapsed.

## Preconditions

- Create and verify a restorable source backup.
- Provision the destination with encrypted storage and a public certificate-valid PostgreSQL endpoint.
- Stop application and worker writes before the final copy and record the exact write-stop timestamp.
- Apply the same immutable application migration ledger to the source before the final copy; source and destination migration tags and checksums must match at verification time.
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

Migrations that add foreign keys or build regular indexes, including `0009_account_data_cascades`, `0010_catalog_entity_provenance`, and `0011_user_catalog_owner_scope`, require a maintenance window. The migration transaction holds table locks until commit; the migration advisory lock only serializes other migration runners and does not stop application writes.

- Put the web application into maintenance mode before running the migration.
- Stop the worker and wait for the current job to finish.
- Run `DATABASE_URL="postgresql://..." bun run --cwd packages/db db:migrate` against the destination.
- Treat a lock-timeout or deadlock error as an aborted migration, keep writes disabled, and rerun it after confirming no application connections are writing.

## Verify Cutover

After the final data copy and before restoring writes, compare schemas and order-independent content fingerprints:

```bash
SOURCE_DATABASE_URL="postgresql://..." \
DESTINATION_DATABASE_URL="postgresql://..." \
PROD_URL="https://oryxel.ai" \
bun run --cwd packages/db db:verify-migration
```

The verifier requires distinct PostgreSQL system/database identity, exact migration tag/checksum parity, exact sequence ownership/value parity, schema/content parity, and a web `/readyz` response with HTTP `200`, `status=ready`, and `database`/`redis` checks set to `ok`.

Destination-only tables fail verification. If a reviewed transition intentionally creates one, list it explicitly:

```bash
DESTINATION_EXTRA_TABLE_ALLOWLIST="temporary_import_audit" \
SOURCE_DATABASE_URL="postgresql://..." \
DESTINATION_DATABASE_URL="postgresql://..." \
PROD_URL="https://oryxel.ai" \
bun run --cwd packages/db db:verify-migration
```

Treat any failure as a rollback condition. Review warnings manually, especially worker inactivity and expected post-cutover drift in volatile authentication tables.

Restore web and worker traffic only after the migration and verification both succeed.

## Safety Window

- Switch the application and workers to the destination together.
- Keep the source database read-only for 24-48 hours.
- Monitor application errors, failed jobs, connection saturation, and destination backups.
- Delete the source only after the safety window, a fresh destination backup, and a restore test all succeed.

## Rollback Phases

Record when the first destination write is acknowledged. The safe rollback procedure changes at that boundary.

Before any acknowledged destination write:

- Stop web and worker traffic.
- Revert all database connection variables to the still-frozen source.
- Redeploy web, worker, and gateway together and require exact `/readyz` success before restoring traffic.

After any acknowledged destination write:

- Treat the source as stale and do not point services back to it.
- Stop writes and preserve both databases and their backups.
- Prefer a forward repair on the destination. If the destination cannot be repaired, perform an explicit reverse migration or restore with reconciliation of every destination write after the recorded boundary.
- Resume traffic only after the repaired database passes migration, sequence, table, and exact readiness gates.
