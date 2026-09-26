# Agentic Company TRD — RelayOS

Status: v0.1 — September 26, 2026

## 1. Architecture principles

- One monorepo, three revenue products, one shared operating system.
- Agents never receive unrestricted production credentials.
- All external side effects go through a policy-enforced tool gateway.
- Every task has an owner, input, output schema, deadline, and audit record.
- Prefer deterministic code for deterministic work; use Opus 5.5 for judgment-heavy work.
- Human approval is a first-class workflow state.
- Every agent action must be replayable or explainable from logs.

## 2. Recommended stack

- Frontend: Next.js, TypeScript, Tailwind.
- API: Next.js route handlers or a small TypeScript service.
- Database: PostgreSQL with row-level workspace isolation.
- Queue: Redis plus BullMQ, or an equivalent durable job queue.
- Agent workers: TypeScript workers calling Claude through the approved API/Claude Code integration.
- Authentication: managed auth provider with workspace membership.
- Billing: Stripe subscriptions and Payment Links.
- Email: Resend, Postmark, or equivalent transactional provider.
- File storage: S3-compatible object storage.
- Observability: structured logs, error tracking, cost telemetry, and uptime checks.
- Deployment: one staging environment and one production environment.

Avoid adding vector databases, Kubernetes, event-sourcing, or complex multi-agent frameworks until a real use case requires them.

## 3. Repository layout

```text
relayos/
  apps/
    web/                 # dashboard, landing pages, admin
    worker/              # durable agent jobs
  packages/
    db/                  # schema, migrations, repositories
    domain/              # leads, workspaces, products, subscriptions
    agents/              # agent contracts and prompts
    tools/               # policy-gated tools
    policy/              # approval and permission rules
    analytics/           # events, metrics, funnels
    content/             # editorial pipeline and publishing queue
    shared/              # schemas, types, utilities
  docs/
  infra/
  tests/
```

## 4. Shared data model

Core tables:

- `workspaces`
- `users`
- `memberships`
- `leads`
- `lead_events`
- `tasks`
- `agent_runs`
- `agent_messages`
- `approvals`
- `tool_calls`
- `knowledge_documents`
- `content_items`
- `products`
- `orders`
- `subscriptions`
- `experiments`
- `metrics_daily`
- `audit_events`

Every customer-owned table must include `workspace_id`. Every sensitive action must include `actor_type`, `actor_id`, `approval_id`, and `correlation_id`.

## 5. Agent hierarchy

### Shared master agents

`ceo_master`

- Reads scorecards and experiment results.
- Creates or kills experiments.
- Cannot send messages, spend money, or deploy directly.

`engineering_master`

- Owns technical backlog, architecture, tests, and releases.
- Can create pull requests and staging deployments.
- Production deploy requires approval.

`growth_master`

- Owns editorial calendar, SEO, distribution, and campaign experiments.
- Can draft and schedule internal work.
- Public publishing requires approval until trust is established.

`sales_master`

- Owns pipeline, qualification, proposals, and customer feedback.
- Can draft outreach and proposals.
- First-contact sending requires approval.

`finance_risk_master`

- Owns revenue, costs, refunds, security checks, and compliance flags.
- Can block actions.
- Cannot transfer funds or alter billing without approval.

### Per-business agents

Each business has:

- `research_agent`
- `builder_or_ops_agent`
- `growth_agent`
- `support_agent`
- `analytics_agent`

## 6. Task lifecycle

```text
idea -> validated -> planned -> queued -> running -> review
     -> approved -> executed -> measured -> improved
                              \-> rejected / retry / escalated
```

Each task must contain:

```json
{
  "task_type": "string",
  "objective": "string",
  "business_line": "relayflow|relayops|relaylab",
  "risk_level": "low|medium|high",
  "inputs": {},
  "expected_output_schema": {},
  "success_metric": "string",
  "deadline": "ISO-8601",
  "requires_approval": true,
  "max_cost_usd": 0
}
```

## 7. Tool gateway

Agents must call tools through a single gateway that enforces:

- Allowed tool list.
- Workspace scope.
- Rate limits.
- Spend limits.
- Data classification.
- Approval requirements.
- Idempotency keys.
- Dry-run support.
- Audit logging.

Initial tools:

- `read_crm`
- `write_crm_draft`
- `create_task`
- `query_analytics`
- `draft_email`
- `draft_content`
- `run_tests`
- `deploy_staging`
- `create_payment_link`
- `publish_content_after_approval`

Blocked by default:

- Arbitrary shell commands in production.
- Unreviewed public publishing.
- Real-money trading.
- Bulk scraping that violates site terms.
- Unbounded email or social messaging.

## 8. Memory design

Use three layers:

1. Short-term task context: current task and recent tool results.
2. Workspace memory: customer configuration, approved facts, brand voice, and workflow rules.
3. Company memory: reusable playbooks, experiments, pricing, and lessons learned.

Store source URLs and timestamps for researched claims. Agents must distinguish facts, assumptions, and recommendations.

## 9. Evaluation suite

Before production access, test:

- Correct lead classification.
- No hallucinated customer facts.
- Correct approval behavior.
- No cross-workspace data leakage.
- Idempotent retries.
- Prompt-injection resistance.
- Correct unsubscribe handling.
- Correct billing and refund boundaries.
- Safe failure when a tool or API is unavailable.
- Cost per successful task.

## 10. Reliability targets

- 99% of low-risk scheduled jobs complete or escalate.
- 100% of external side effects are logged.
- 0 cross-workspace data leaks.
- 0 unapproved payments or public messages.
- All production database migrations are reversible.
- Mean time to detect agent failure under 15 minutes.

## 11. Deployment stages

1. Local mock tools.
2. Staging with synthetic customer data.
3. Pilot workspace with manual approval for every side effect.
4. Production with low-risk autonomy only.
5. Expanded autonomy after 30 days of clean logs and passing evaluations.
