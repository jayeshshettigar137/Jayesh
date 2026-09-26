# RelayOS

Agent-operated company serving home-service businesses. See the product requirements in [docs/PRD.md](docs/PRD.md).

This repository currently contains **RelayFlow**, the lead capture, quote preparation, and follow-up micro-SaaS (PRD §4). Its agent does the preparation work, and people make every decision that reaches a customer. Nothing is sent until a human approves it.

## What works

| PRD requirement | Where |
|---|---|
| Workspace and user accounts | `/signup`, `/login`, team members in Settings (`relayflow/service.py`, `auth.py`) |
| Lead intake form and webhook | Public form `/f/<slug>`; `POST /hooks/leads/<token>` (JSON or form) |
| Lead status pipeline | new → contacted → quoted → booked / lost, with a next action per lead |
| AI lead summary and quote-request checklist | `relayflow/ai.py`, using Claude or an offline template drafter |
| Configurable email follow-up sequences | `/sequence`. Each step becomes a draft, and delays count from the last send. |
| Human approval before external messages | `/approvals`. `send_message` refuses anything not approved by a signed-in user. |
| Dashboard | Leads, median first-response time, follow-up status, booked jobs, win rate |
| Stripe subscription billing | Checkout, Customer Portal, and a signed webhook (`relayflow/billing.py`) |
| Audit log for every agent action | `/audit` and `/audit.csv`. Covers agent, user, webhook, and Stripe actions. |
| CSV import/export | `/data`. Import requires a permission confirmation and never auto-enrolls leads in outreach. |
| Clone a proven workflow into a new workspace | Workflow JSON export and import on `/sequence` |

### Safety rules enforced in code (PRD §6)

- **Drafts only.** The agent (`prepare_lead`, `run_agent_tick`) creates drafts. It has no code path that sends.
- **Approval gate.** Only a signed-in user row can approve, and `send_message` blocks unapproved messages and logs the attempt.
- **No commitments.** The prompt forbids prices, discounts, and promised times. Every draft, including human edits, is also scanned for price or schedule language. A flagged draft cannot be approved until the reviewer ticks an explicit acknowledgement.
- **One draft at a time.** A lead never has more than one outstanding draft, so drafts can't pile up and get bulk-sent.
- **Customer data uploads** require an explicit permission checkbox. Imported leads are not enrolled in sequences.
- **Subscriptions** can only be started or changed by the workspace owner through Stripe-hosted pages.
- **Tenant isolation.** Every query is scoped to the workspace.

## Run it

```bash
pip install -r requirements.txt
python -m relayflow serve            # http://127.0.0.1:8000/signup
python -m pytest                      # test suite
```

Run the agent on a schedule (every 5–15 minutes) to prepare leads it missed and draft due follow-up steps. It never sends.

```bash
*/10 * * * * cd /srv/relayflow && python -m relayflow tick
```

### Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `RELAYFLOW_DB` | `relayflow.db` | SQLite database path |
| `RELAYFLOW_SECRET_KEY` | dev value | **Set in production.** Signs form (CSRF) tokens. |
| `RELAYFLOW_BASE_URL` | `http://localhost:8000` | Used in intake links and Stripe redirects |
| `RELAYFLOW_SECURE_COOKIES` | off | Set to `1` behind HTTPS |
| `ANTHROPIC_API_KEY` | – | When set, lead prep uses Claude (`claude-opus-5`, low effort, structured output). Otherwise the offline template drafter runs. |
| `RELAYFLOW_AI_PROVIDER` | auto | `anthropic` or `template` |
| `RELAYFLOW_AI_MODEL` | `claude-opus-5` | Model for lead prep |
| `RELAYFLOW_MAIL_MODE` | `outbox` | `outbox` records approved sends without delivering them. `smtp` delivers them. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `MAIL_FROM` | – | SMTP delivery (STARTTLS) |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` | – | Billing. The $99/mo price lives in Stripe, not in code. |

Claude calls opt into server-side refusal fallbacks (`fallbacks: "default"`). If the call fails or is declined, the lead is still prepared by the template drafter, and the audit log records which provider ran.

## Not built yet (PRD "should have")

These are the next steps. None of them block launch.

- Calendar link integration
- Gmail and Outlook integration
- SMS integration
- A richer knowledge base beyond the business profile
- Weekly owner report

See [docs/OPERATIONS.md](docs/OPERATIONS.md) for backup, rollback, and the launch-gate checklist.
