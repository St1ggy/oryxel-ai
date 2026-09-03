# Production Operations

This runbook covers routine deploys and first response for the Oryxel web, worker, and job-stream gateway services. Use [Database Cutover](db-cutover.md) for provider migrations and [Background Job Leases](job-leases.md) for lease semantics.

## Service Model

| Service            | Platform | Required dependencies    | Degraded behavior                                                                                                            |
| ------------------ | -------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Web                | Vercel   | App PostgreSQL and Redis | PostgreSQL sessions continue; sensitive limits fail closed and ordinary API policies fail open during a runtime Redis outage |
| Worker             | Railway  | App PostgreSQL and Redis | Readiness fails while interval polling can continue when Redis wake-ups or publishes fail                                    |
| Job-stream gateway | Railway  | App PostgreSQL and Redis | Returns unavailable readiness; browsers fall back to job-status polling when SSE fails                                       |

`/healthz` confirms that a process can serve HTTP. `/readyz` confirms required Redis access and the complete PostgreSQL migration ledger before a service may receive production traffic. Do not use a healthy liveness response as evidence that dependencies are ready.

## Deployment

### Initial Railway/Vercel Provisioning

Use Railway PostgreSQL as the only app database. Provision Redis, the worker, and the job-stream gateway in the same Railway project and region. Deploy the web application on Vercel in a function region close to Railway.

| Component          | Platform | Repository settings                                                                                                         | Network configuration                                                               |
| ------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| PostgreSQL         | Railway  | Managed PostgreSQL                                                                                                          | Private URL for Railway services; public URL for Vercel and operator-run migrations |
| Redis              | Railway  | Managed Redis                                                                                                               | Private URL for Railway services; public URL for Vercel                             |
| Worker             | Railway  | Repository root; config file `/apps/worker/railway.toml`                                                                    | No public domain required                                                           |
| Job-stream gateway | Railway  | Repository root; config file `/apps/job-stream-gateway/railway.toml`                                                        | Public HTTPS domain required                                                        |
| Web                | Vercel   | Root `apps/web`; include outside-root sources; install `cd ../.. && bun install --frozen-lockfile`; build `bunx vite build` | Custom or Vercel domain; configure the final domain before OAuth callbacks          |

Configure Railway service references instead of copying private credentials:

| Variable       | Worker and gateway           | Vercel web                    |
| -------------- | ---------------------------- | ----------------------------- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Railway `DATABASE_PUBLIC_URL` |
| `REDIS_URL`    | `${{Redis.REDIS_URL}}`       | Railway `REDIS_PUBLIC_URL`    |

Addresses ending in `.railway.internal` resolve only inside Railway and must not be supplied to Vercel or local migration commands. Apply the app migration history to a new Railway database before starting application services; do not run `db:push` or set `DATABASE_MIGRATION_BASELINE` for a new database.

Provision services in this order:

1. Create Railway PostgreSQL and Redis, enable PostgreSQL backups, and record their public endpoints outside the repository.
2. Generate independent production values for `BETTER_AUTH_SECRET`, `AI_KEYS_ENCRYPTION_KEY`, `JOB_STREAM_JWT_SECRET`, and `ADMIN_SECRET`.
3. Run `DATABASE_URL="postgresql://..." bun packages/db/src/migrate.ts` against Railway `DATABASE_PUBLIC_URL`.
4. Configure and deploy the worker and gateway with Railway private service references.
5. Generate the gateway public domain and set it as Vercel `PUBLIC_JOB_STREAM_URL`.
6. Set gateway `STREAM_CORS_ORIGIN` and web `ORIGIN` to the exact final web origin.
7. Configure at least one OAuth callback at `https://<web-origin>/api/auth/callback/<provider>`.
8. Deploy web, run readiness and authenticated product smoke checks, then switch production DNS or promote the deployment.

### Preflight

1. Run `bun run verify` from the repository root.
2. Confirm the release commit and review every migration added under `packages/db/drizzle` or `packages/catalog-db/drizzle`.
3. Verify current backups and restore capability before a release that changes either database.
4. Confirm environment parity across Vercel and Railway without copying secret values into tickets or logs.
5. Record the currently successful Vercel deployment and Railway deployments as rollback targets.
6. Treat a missing production `REDIS_URL` as a deployment-blocking configuration error: web readiness fails, worker startup rejects it, and gateway startup already requires it.

### Environment Contract

| Variable                 | Web                               | Worker               | Gateway  | Notes                                                             |
| ------------------------ | --------------------------------- | -------------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`           | Required                          | Required             | Required | All services must use the same app database during a release      |
| `CATALOG_DATABASE_URL`   | Not used                          | Not used             | Not used | Supply only to catalog migration and ingestion tooling            |
| `REDIS_URL`              | Production required               | Production required  | Required | Shared rate-limit, wake-up, and stream infrastructure             |
| `JOB_STREAM_JWT_SECRET`  | Required                          | Not used             | Required | Values must be identical; rotate both sides together              |
| `PUBLIC_JOB_STREAM_URL`  | Required at build time            | Not used             | Not used | Redeploy web after changing it                                    |
| `STREAM_CORS_ORIGIN`     | Not used                          | Not used             | Required | Set to the exact web origin in production                         |
| `BETTER_AUTH_SECRET`     | Required                          | Not used             | Not used | Use a high-entropy production secret                              |
| `AI_KEYS_ENCRYPTION_KEY` | Required for stored provider keys | Required for AI jobs | Not used | Rotate only with an explicit data migration plan                  |
| `PLATFORM_AI_PROVIDER`   | Optional                          | Optional             | Not used | Used only together with `PLATFORM_AI_KEY`                         |
| `PLATFORM_AI_KEY`        | Optional                          | Optional             | Not used | Requires per-user `platform_access=true`; revocation is immediate |
| OAuth client variables   | Per enabled provider              | Not used             | Not used | Configure matching callback URLs on the final web origin          |
| `ADMIN_SECRET`           | Required for grant administration | Not used             | Not used | Protects platform-access changes                                  |

### Release Without Migrations

1. Deploy the gateway and worker revisions on Railway.
2. Wait for both Railway `/readyz` checks to pass.
3. Deploy the web revision on Vercel.
4. Inspect web `/readyz` and require top-level `status=ready` plus both `checks.database.status` and `checks.redis.status` equal to `ok`.
5. Verify authentication, one ordinary API read, and one background job through completion.
6. Confirm `job.enqueued`, `job.processing.started`, `job.processing.finished`, `stream.opened`, and `stream.closed` events for the smoke job by `jobId`.

### Release With Migrations

1. When a migration can lock tables or is not backward compatible, set `MAINTENANCE_MODE=true` in the Vercel environment, deploy web with that value, and verify a non-health route returns `503` before changing the database.
2. Gracefully stop the worker. Record active `jobId` values and wait for their finished or failed events before shutdown; if the process is forced to exit, do not expect lease expiry to update rows while every worker is stopped.
3. Apply app migrations with `DATABASE_URL="postgresql://..." bun run --cwd packages/db db:migrate`.
4. Apply catalog migrations with `CATALOG_DATABASE_URL="postgresql://..." bun run --cwd packages/catalog-db migrate`.
5. Deploy gateway and web code that is compatible with the migrated schema.
6. Deploy and start the worker last. On startup, confirm its recovery sweep makes any expired processing leases explicitly failed before considering replay.
7. Wait for all `/readyz` checks and complete the smoke verification, including an explicit `checks.redis.status` check in the web response.
8. Set `MAINTENANCE_MODE=false`, deploy web again with that value, and verify normal routes only after runtime verification succeeds.

For a provider change or legacy migration adoption, follow [Database Cutover](db-cutover.md) instead of this abbreviated sequence.

## Post-Deploy Verification

Use public service URLs without query strings or credentials:

```bash
curl --fail-with-body --silent --show-error "$WEB_URL/healthz"
curl --fail-with-body --silent --show-error "$WEB_URL/readyz"
curl --fail-with-body --silent --show-error "$GATEWAY_URL/healthz"
curl --fail-with-body --silent --show-error "$GATEWAY_URL/readyz"
```

Verify the Railway worker through its configured `/readyz` health check. A successful release also requires an authenticated product smoke test because readiness does not exercise OAuth, AI providers, catalog access, or a complete background job.

## Rollback

1. Stop further deployments and preserve the failing deployment logs.
2. If continued writes can corrupt data or amplify the incident, set `MAINTENANCE_MODE=true`, deploy web with that value, and verify a non-health route returns `503` before relying on maintenance mode.
3. Redeploy the last known-good Railway worker and gateway revisions.
4. Promote or redeploy the last known-good Vercel web deployment.
5. Restore the previous environment-variable values when configuration caused the incident.
6. Re-run readiness and product smoke checks, then set `MAINTENANCE_MODE=false`, redeploy web, and verify normal routes before ending the rollback.

Do not delete, rename, or edit an applied migration to make code rollback easier. Prefer a forward-compatible fix. Restore a database backup only with writes stopped and an explicit recovery decision, because restore discards data created after that backup.

If the previous code cannot run against the current schema, keep maintenance mode enabled and deploy a forward fix rather than forcing an incompatible rollback.

## Incident Response

1. Declare the incident, assign an owner, and freeze unrelated deploys.
2. Record the first observed time, affected user flows, current deployment revisions, and dependency status.
3. Check `/readyz` for web, worker, and gateway before investigating feature-level symptoms.
4. Correlate JSON logs with `requestId` for one HTTP request and `jobId` for its enqueue, worker, and stream lifecycle.
5. Contain impact with maintenance mode, a service rollback, or dependency isolation.
6. Restore service, run the post-deploy checks, and watch for recurrence before resolving the incident.
7. Preserve a timeline and create follow-up work for missing alerts, automation, or idempotency controls.

Structured production logs intentionally omit stack traces, arbitrary exception messages, request bodies, query strings, user IDs, and tokens. Use `service`, `event`, `errorName`, `errorCode`, `requestId`, and `jobId` for triage; inspect sensitive database state only through approved administrative access.

## Redis Degradation

Expected behavior during a Redis outage:

- A missing `REDIS_URL` is rejected by production startup/readiness and is not a supported degradation mode.
- Web account, admin, and AI rate-limit policies return `503` when they cannot enforce a sensitive limit.
- Ordinary read and mutation policies continue in fail-open mode and emit `rate_limit.unavailable`.
- Better Auth sessions always read and revoke through PostgreSQL; Redis is used only by its custom rate-limit storage.
- Worker jobs continue through the one-second PostgreSQL polling fallback, but wake-ups and live publishes are delayed or absent.
- Gateway readiness returns `503`; active streams also reconcile PostgreSQL every five seconds, while clients retain HTTP polling fallback.

Recovery procedure:

1. Verify PostgreSQL readiness before attributing all symptoms to Redis.
2. Confirm the Redis service, credentials, TLS mode, and `REDIS_URL` parity across all three services.
3. Restore Redis or roll back the configuration change; do not flush keys as a generic repair.
4. Verify gateway `/readyz`; inspect web `/readyz` and require its required Redis check to be `ok`.
5. Enqueue one job and confirm worker wake-up and SSE delivery.

Redis contains no authoritative job or session state, so a normal Redis restore does not require replaying jobs or copying session records.

## Background Job Recovery

PostgreSQL table `background_job` is authoritative. Inspect aggregate state before acting:

```sql
SELECT status, type, count(*) AS jobs, min(created_at) AS oldest
FROM background_job
GROUP BY status, type
ORDER BY status, type;
```

Use these rules:

- A growing `pending` backlog indicates that workers cannot claim work; restore worker readiness and database access before changing rows.
- A worker renews an active lease every 30 seconds. The recovery sweep marks expired processing leases as failed every 30 seconds.
- The recovery sweep runs only inside a worker process. If all workers are stopped, expired rows remain `processing` until a worker starts and performs recovery.
- Failed or expired jobs are not automatically retried because business side effects are not universally idempotent.
- `background_job.error_message` contains a controlled failure code, not provider or database exception text; use the matching structured event and `jobId` for diagnostics.
- Do not change a failed job back to `pending` until every side effect for that job type has a durable idempotency guarantee.
- Prefer asking the user to repeat the product action after confirming the previous attempt's effects.
- Preserve the original job row and `jobId` for incident evidence.

If a worker must be stopped during a deploy, let it drain. A claimed but unstarted shutdown job is returned to `pending`; a process that stops after a side effect may require manual product-state review rather than replay.

## Secret Exposure

If logs, commits, or tickets contain a credential:

1. Revoke or rotate the credential immediately; redaction after exposure is not remediation.
2. Rotate shared values such as `JOB_STREAM_JWT_SECRET` on all consumers in one coordinated maintenance window.
3. Remove the exposed material from active systems and restrict access to retained incident evidence.
4. Redeploy every service whose environment changed and run readiness plus product smoke checks.
