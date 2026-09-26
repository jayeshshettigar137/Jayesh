# RelayOS operations runbook

## Environments (TRD §2, §11)

| Stage | Where | Data | LLM | Email | Payments |
|---|---|---|---|---|---|
| 1. Local mock tools | laptop / CI | synthetic (`npm run db:seed`) | mock | mock outbox | off |
| 2. Staging | staging host | synthetic only | Anthropic (spend-capped) | mock outbox | Stripe test mode |
| 3. Pilot | production host, one workspace | real, one customer | Anthropic | real provider | test → live after sign-off |
| 4. Production | production host | real | Anthropic | real provider | live |

Every side effect needs manual approval through stage 3. Widening autonomy (stage 5) needs 30 days of clean logs and passing evaluations, plus a code change to `APPROVAL_REQUIRED_CATEGORIES`, reviewed by a human.

## Processes

- **Web:** `npm run build && npm start -w @relayos/web` (Next.js on port 3000). Health check: `GET /api/health` returns 200 when the database is reachable.
- **Worker:** `npm run worker`. Run one or more instances. Jobs are claimed with `SKIP LOCKED`, so extra workers are safe. A job locked for more than 10 minutes (crashed worker) is reclaimed automatically.
- **Migrations:** `npm run db:migrate`, using the owner role (`DATABASE_ADMIN_URL`). The app and worker connect with the non-superuser `relayos_app` role (`DATABASE_URL`) so row-level security applies.

## Monitoring (TRD §10: detect agent failure within 15 minutes)

Alert on these log lines. Logs are structured JSON on stdout.

- `level=error`: any occurrence
- `msg="job failed"` with `outcome=dead`: an agent job was escalated to a human
- `msg="tool call denied"`: expected occasionally. A spike means an agent is misbehaving or under attack.
- `/api/health` non-200 for more than 2 minutes

Quick SQL checks (run as the owner role):

```sql
-- Stuck or dead jobs
SELECT type, status, count(*), max(updated_at) FROM jobs WHERE status IN ('running','dead') GROUP BY 1,2;
-- Escalations in the last day
SELECT count(*) FROM lead_events WHERE type = 'agent.escalated' AND created_at > now() - interval '1 day';
-- Agent spend today by workspace
SELECT workspace_id, sum(cost_usd) FROM agent_runs WHERE started_at > date_trunc('day', now()) GROUP BY 1;
```

## Backup and restore

- Use managed Postgres with point-in-time recovery, or take `pg_dump -Fc` hourly and keep 48 hourly and 30 daily copies off-host.
- **Take a backup immediately before every deploy that includes a migration.**
- Test a restore monthly. Restore into a scratch database, point a local web instance at it, and log in.
- Stripe is the source of truth for payments. After a restore, resend missed webhooks from the Stripe Dashboard for the gap period. The order upsert is idempotent.

## Deploy and rollback

1. Deploy from a tagged commit, and record the previous tag.
2. Back up the database, then run `npm run db:migrate`.
3. Deploy web and worker, then check `/api/health` and one login.
4. **Rollback:** redeploy the previous tag. If the release included a migration, run `npm run db:rollback` (every migration has a tested `down`; see `packages/db/test`). A down migration that drops data needs human approval (PRD §6). If in doubt, restore the pre-deploy backup instead.

## Incident: suspected prompt injection or bad draft sent

1. Pause sending: approvals stay queued, so tell reviewers to stop approving.
2. Find the chain: `SELECT * FROM audit_events WHERE correlation_id = '<id>' ORDER BY id;`. The agent's prompt and response are in `agent_messages` for the run.
3. If a message went out, contact the customer personally. Add a regression case to `tests/evals/adversarial.test.ts`.
