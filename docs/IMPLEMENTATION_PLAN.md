# RelayOS implementation plan

Status: v0.1, September 26, 2026. Sources: [PRD](PRD.md), [TRD](TRD.md), [Bootstrap brief](BOOTSTRAP.md), [Revenue plan](REVENUE_PLAN.md).

**Goal for October 20:** a safe, testable shared foundation and a sellable RelayFlow demo. This is **not** three complete companies.

## Starting point

The repo held a first-pass RelayFlow MVP in Python (FastAPI and SQLite). The owner chose to rebuild on the TRD stack. That MVP's behavior and tests are ported, and the Python code is removed once the TypeScript version covers it.

## Decisions (and what would change them)

| Area | Choice | Why / when to revisit |
|---|---|---|
| Monorepo | npm workspaces, TypeScript packages consumed from source (no build step) | Zero extra tooling. Move to pnpm or Turborepo if install or build times hurt. |
| Web | Next.js App Router and Tailwind (`apps/web`) | Per the TRD |
| Database | PostgreSQL 16 with **row-level security** on every workspace table. The app connects as a non-superuser role and sets `app.workspace_id` per transaction. | Isolation is enforced by the database, not only by `WHERE` clauses |
| Migrations | Plain SQL `NNN_name.up.sql` / `.down.sql` with a small runner. The test suite runs up → down → up. | TRD §10 requires reversible migrations |
| Queue | Durable Postgres queue (`jobs` table, `FOR UPDATE SKIP LOCKED`) behind a `JobQueue` interface, plus an in-memory adapter for tests | Counts as "equivalent durable job queue" (TRD §2) with one less service. Swap in BullMQ behind the same interface if throughput needs Redis. |
| LLM | `LlmProvider` interface. `AnthropicProvider` uses `claude-opus-5-5` for judgment work (TRD §1). `MockProvider` is deterministic and is the default in dev and tests. | Real calls only when `LLM_PROVIDER=anthropic` and a key is present |
| Email | `EmailAdapter` interface with a mock outbox by default | Add a Resend or Postmark adapter at the pilot stage |
| Payments | Stripe behind `FEATURE_STRIPE`. Only `sk_test_` keys are accepted unless `ALLOW_LIVE_PAYMENTS=true`. | Live mode needs a human decision |
| Auth | `AuthProvider` interface with a local password adapter for dev and pilot, plus memberships and roles | **Open decision:** pick a managed provider (Clerk, Auth0, WorkOS) before production |
| Niche for demo/landing page | HVAC | Easy to change. It's copy only. |

## Architecture in one paragraph

Agents never touch integrations directly. They propose **tool calls** to `packages/tools`' `ToolGateway`. For every call, the gateway checks, in order:

1. The actor's allowed-tool list
2. Hard-blocked tools
3. Workspace scope
4. Input schema
5. Data classification
6. Rate limit
7. Spend limit
8. Approval requirement
9. Idempotency key

It then either runs the tool as a dry run, runs it for real, or parks it as a **pending approval**. Approvals bind to a hash of the exact payload and are single-use. Every call writes a `tool_calls` row and an `audit_events` row carrying `actor_type`, `actor_id`, `approval_id`, and `correlation_id`. Tasks follow the TRD §6 state machine, and agent runs record prompts, outputs, cost, and the provider so they can be replayed.

## Phases

1. **Foundation.** Build the monorepo layout from TRD §3, zod env validation with safe placeholders, the schema and migrations (workspaces, users, memberships, sessions, leads, lead_events, tasks, agent_runs, agent_messages, approvals, tool_calls, outbound_messages, audit_events, jobs), RLS, typed domain contracts, and the queue abstraction.
2. **Policy gateway.** Risk levels, the approval policy, dry runs, idempotency, rate and spend limits, and audit with correlation IDs. Tests prove that messaging, payment, publishing, and production deploys cannot run without approval.
3. **RelayFlow slice.** Onboarding, the intake endpoint, the leads dashboard, AI summary and follow-up draft (the provider adapter, output validated by schema and fact-checked), the approval queue, sending through the gateway, the weekly metrics view, the audit view, and a worker.
4. **Sales readiness.** Demo seed data, an HVAC landing page, the RelayOps implementation checklist, the RelayLab Follow-Up Kit page, and Stripe Payment Links and webhooks behind the flag in test mode.
5. **Evaluation.** Adversarial tests for prompt injection, workspace isolation, hallucinated facts, duplicate sends, retries, missing API responses, unsubscribes, and refund boundaries. Also a full clean-checkout run and `docs/RELEASE_CHECKLIST.md`.

## Out of scope for this slice

- Social publishing automation
- Real-money trading
- Autonomous cold outreach
- Web scraping
- Master-agent orchestration (CEO, growth, and so on). Their permission profiles exist in policy, but there are no autonomous loops yet.
- Vector databases
- Kubernetes

## Risks

- **Timeline.** 24 days to $10k depends mostly on sales activity, not code. Engineering should stop at "sellable demo plus pilot-safe" and not gold-plate.
- **Managed auth isn't chosen.** The local adapter is fine for a pilot, but not for scale.
- **Deliverability.** Real email sending needs a verified domain (SPF, DKIM, DMARC) before the pilot.
- **Real Claude output hasn't been measured.** Evals use the mock provider. Run the eval set against `claude-opus-5-5` once, with approval for the spend, before the pilot.
