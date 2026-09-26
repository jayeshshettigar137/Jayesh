# RelayOS

RelayOS is a small, agent-operated company serving home-service businesses. This monorepo holds its shared operating system and the first product, **RelayFlow**. RelayFlow does lead capture, quote preparation, and follow-up, and a person approves every customer-facing message.

- Product and business: [docs/PRD.md](docs/PRD.md) and [docs/REVENUE_PLAN.md](docs/REVENUE_PLAN.md)
- Architecture: [docs/TRD.md](docs/TRD.md). Build plan and decisions: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- Before launch: [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md). Operations: [docs/OPERATIONS.md](docs/OPERATIONS.md)
- Selling: [RelayOps implementation checklist](docs/relayops/IMPLEMENTATION_CHECKLIST.md) and the [Follow-Up Kit outline](docs/relaylab/FOLLOW_UP_KIT_OUTLINE.md)

## Quick start

Requirements: Node 22+ and PostgreSQL 16.

```bash
docker compose -f infra/docker-compose.yml up -d   # or: psql -f infra/db-init.sql against your own Postgres
cp .env.example .env                                # safe local placeholders; mock LLM, mock email, Stripe off
npm install
npm run db:migrate
npm run db:seed -- --reset                          # optional synthetic HVAC demo workspace
npm run dev                                         # web on http://localhost:3000
npm run worker                                      # in another terminal: processes agent jobs
npm test                                            # full suite (needs Postgres; creates relayos_test)
```

The demo login is printed by the seed command: `demo-owner@example.com` with password `demo-password-2026`. On the approvals page, **Run agent now** processes queued jobs without starting the worker.

## Layout (TRD §3)

```text
apps/web        Next.js 16 + Tailwind: dashboard, approvals, metrics, audit, settings,
                public quote form, intake webhook, HVAC landing page, Follow-Up Kit page, Stripe webhook
apps/worker     Durable job loop (retry with backoff, escalate to a human); demo seed
packages/shared env validation, ids/hashing/signed tokens, structured logger, JobQueue + in-memory adapter
packages/db     Postgres client with per-workspace RLS transactions, reversible migrations, audit log, Postgres queue
packages/policy Pure permission rules: tool categories, blocked tools, agent profiles (TRD §5), who may approve
packages/tools  ToolGateway (the only path to side effects), approvals, adapters (mock, plus Stripe behind a flag)
packages/agents LLM provider adapter (Claude Opus 5.5 / mock), lead-intake agent contract, draft guards
packages/domain Onboarding, auth, leads, tasks (TRD §6), concrete tools, lead-prep workflow, billing
packages/analytics Weekly scorecard and pipeline counts
tests/          Test DB setup and the TRD §9 adversarial evaluation suite
```

`packages/content` is intentionally a stub for now. The `draft_content` and `publish_content_after_approval` tools live in the domain registry until the editorial pipeline has a real use case.

## How safety is enforced

| Rule (PRD §6, TRD §7) | Where it's enforced |
|---|---|
| External messages, payments, publishing, and production deploys need a human | `@relayos/policy` `APPROVAL_REQUIRED_CATEGORIES`. The gateway parks the call as a pending approval. |
| Approvals can't be replayed or altered | Each approval is bound to a payload hash, single-use, expires after 72 hours, and is scoped to one workspace (RLS) |
| Agents can't approve | `canApprove` accepts only signed-in members. Money and production approvals need an owner or admin. |
| Shell, trading, scraping, unreviewed publishing, and bulk email are blocked | `BLOCKED_TOOLS`. There is no approval path. |
| Agents stay in their lane | Per-role allow lists and data-classification clearance (TRD §5) |
| No cross-workspace leakage | Postgres row-level security. The app role has no `BYPASSRLS`. |
| Everything is explainable | Every gateway call writes `tool_calls` and `audit_events` with actor, approval ID, and correlation ID. Agent runs store the full prompt and response transcript. `audit_events` is insert-only for the app. |
| Drafts don't invent facts or make commitments | `checkDraft` flags prices, schedule promises, and contact details, links, or claims not found in the lead or approved facts. Flagged drafts need explicit acknowledgement. |
| Retries are safe | Idempotency keys on tool calls, idempotency at the provider level for email, idempotent jobs |
| Spend is bounded | A daily agent budget per workspace (tools and model), per-task cost caps, and per-tool rate limits |

## Configuration

See [.env.example](.env.example). The defaults are safe: mock LLM, mock email outbox, and Stripe off. Env validation refuses these:

- A live Stripe key unless `ALLOW_LIVE_PAYMENTS=true`
- A placeholder secret in production
- The Anthropic provider without a key

It never echoes secret values.

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` | Real lead prep with `claude-opus-5-5` at low effort, structured output, and server-side refusal fallbacks |
| `FEATURE_STRIPE`, `STRIPE_*` | Checkout for the Follow-Up Kit, approval-gated payment links, and the order webhook |
| `SALES_FORM_SLUG` | Routes the landing page's "Request a workflow audit" button into RelayOS's own RelayFlow workspace |
| `AGENT_DAILY_SPEND_LIMIT_USD` | Per-workspace daily cap on agent spend (default $5) |
