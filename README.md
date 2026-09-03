# Oryxel AI

Oryxel AI is an AI-assisted fragrance diary, recommendation workspace, and social collection app. The monorepo contains a SvelteKit web application, a PostgreSQL-backed background worker, and a dedicated SSE gateway for live job progress.

## Architecture

| Component                 | Runtime                                            | Production target  | Health                                                    |
| ------------------------- | -------------------------------------------------- | ------------------ | --------------------------------------------------------- |
| `apps/web`                | SvelteKit on Vercel Functions                      | Vercel             | `/healthz`, `/readyz`                                     |
| `apps/worker`             | Bun/Node background worker                         | Railway            | `/healthz`, `/readyz`                                     |
| `apps/job-stream-gateway` | Bun/Node SSE service                               | Railway            | `/healthz`, `/readyz`                                     |
| `packages/db`             | App and authentication schema via postgres.js      | Railway PostgreSQL | Full migration ledger checked by service readiness        |
| `packages/catalog-db`     | Canonical fragrance catalog schema                 | PostgreSQL         | Used by catalog-backed features                           |
| Redis                     | Auth/API rate limits, worker wake-ups, SSE updates | Railway Redis      | Production required by web, worker, and gateway readiness |

PostgreSQL is authoritative for application state, Better Auth sessions, and background jobs. Redis provides atomic distributed limits, worker wake-ups, and SSE notifications; it stores no authoritative session or job state. Every production readiness check validates the complete app migration ledger, not only database connectivity.

Canonical catalog identities are globally unique. User-created brand and fragrance identities are owner-scoped and are visible only to their owner unless promoted through a separate catalog process.

## Local Development

Requirements: Bun `1.2.12`, Node.js with npm for the current test orchestrator, PostgreSQL, and Redis when testing distributed limits or live job streams. Install the Playwright browser once before running the complete test suite:

```bash
bunx playwright install chromium
```

```bash
bun install --frozen-lockfile
cp .env.example .env.development
```

Populate `.env.development`, then apply both append-only migration histories:

```bash
bun run --cwd packages/db db:migrate
bun run --cwd packages/catalog-db migrate
```

Start the web application:

```bash
bun run dev
```

Run the worker and SSE gateway in separate terminals when exercising background jobs:

```bash
bun --env-file=.env.development run start:worker
bun --env-file=.env.development run start:job-stream-gateway
```

The gateway requires `REDIS_URL` and `JOB_STREAM_JWT_SECRET`. Local workers can poll PostgreSQL without Redis, but production worker startup rejects a missing `REDIS_URL`; a runtime Redis outage makes readiness fail while PostgreSQL polling continues.

## Verification

Run the complete production gate before merging or deploying:

```bash
bun run verify
```

This runs formatting and lint checks, TypeScript and Svelte checks, migration-history validation, unit and Playwright tests, and production builds for all deployable services.

## Configuration

Copy `.env.example` as the local baseline. Production secrets belong in Vercel or Railway environment variables and must not be committed; verify feature-specific variables against the consuming service before deployment.

The following values must agree across services:

- `DATABASE_URL`: web, worker, and gateway app database.
- `CATALOG_DATABASE_URL`: catalog migration and ingestion tooling only; do not distribute it to runtime services that do not consume it.
- `REDIS_URL`: web, worker, and gateway Redis deployment.
- `JOB_STREAM_JWT_SECRET`: identical high-entropy secret on web and gateway.
- `PUBLIC_JOB_STREAM_URL`: public gateway base URL embedded in the web build.
- `STREAM_CORS_ORIGIN`: exact production web origin on the gateway.

## Operations

- [Production operations](docs/operations.md): deployment, rollback, incident response, Redis degradation, and job recovery.
- [Database cutover](docs/db-cutover.md): provider migration and parity verification.
- [Background job leases](docs/job-leases.md): lease deployment and non-replay guarantees.
- [Database audit state](docs/db-audit-current-state.md): historical schema audit notes.
