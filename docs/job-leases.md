# Background Job Leases

PostgreSQL is the source of truth for background jobs. Redis only wakes workers and publishes best-effort job stream updates.

## Deployment

Migration `0008_background_job_leases.sql` is a coordinated cutover because pre-lease workers cannot populate the new lease columns.

1. Enable maintenance mode for job-producing endpoints.
2. Stop and drain every old worker replica.
3. Deploy the read-only job status code to web and the stream gateway.
4. Apply app database migration `0008_background_job_leases.sql`.
5. Deploy and start the lease-aware worker.
6. Disable maintenance mode after a pending job is claimed and completed successfully.

Do not run old and lease-aware workers against the migrated database at the same time. The migration marks existing `processing` jobs as failed because replaying their non-idempotent side effects is unsafe.

## Runtime Semantics

- Claims use `FOR UPDATE SKIP LOCKED` and assign a five-minute lease.
- Active workers renew leases every 30 seconds.
- Progress, partial result, completion, and failure writes require the active lease token.
- An independent worker sweep marks expired leases as failed every 30 seconds.
- Status reads never mutate jobs.
- Expired jobs are not automatically retried. Add idempotency keys or an outbox before enabling replay.

Lease fencing protects the job row. It does not make unrelated business writes exactly-once. A process can commit a side effect and stop before marking the job done, so notification, activity, chat, and patch replay must remain disabled until those writes have durable idempotency constraints.
