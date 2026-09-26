# RelayFlow release checklist

Status: September 26, 2026. **Not production-ready.** The foundation and demo are done and tested. The items marked ☐ need human decisions, accounts, or measurements that code can't supply.

This checklist makes no claims about revenue, customers, or model quality. There is no evidence for any of them yet.

## Bootstrap acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| A new workspace can be created locally | ✅ | `packages/domain/test/relayflow.test.ts` › onboarding; browser flow at `/signup` |
| A synthetic lead can enter the system | ✅ | Webhook `POST /api/intake/<token>` (201, or 422 for an invalid lead), the public form `/r/<slug>`, and manual entry |
| The system produces a structured summary and follow-up draft | ✅ | Output is validated against the `LeadAnalysis` schema, then guard-checked. See the acceptance test. |
| The draft is visible in an approval queue | ✅ | `/app/approvals`, `approvalQueue()` |
| The send tool fails safely without approval | ✅ | `tools/test/gateway.test.ts` and the acceptance test: "approval is pending", nothing delivered |
| All actions appear in the audit log | ✅ | Audit assertions on the full correlation chain; `/app/audit` |
| Tests pass from a clean checkout | ✅ | A fresh clone passes `npm ci && npm run typecheck && npm test && npm run build` (111 tests). CI runs the same in `.github/workflows/ci.yml`. |

## TRD §9 evaluation suite (`tests/evals/adversarial.test.ts`)

| Item | Automated | Notes |
|---|---|---|
| Correct lead classification | ⚠️ Partial | Contract regression runs on the mock provider only. ☐ A labelled eval set against `claude-opus-5-5` is still needed (see below). |
| No hallucinated customer facts | ✅ | Invented phone numbers, emails, links, credentials, and review claims are flagged. Approved facts are not. |
| Correct approval behavior | ✅ | Pending, approved, consumed, rejected, expired, tampered payload, cross-workspace, agent approver, and member approving a payment |
| No cross-workspace data leakage | ✅ | Postgres RLS with a non-bypass role. Reads, writes, drafts, approvals, and agent runs across workspaces are all tested. |
| Idempotent retries | ✅ | One task, one draft, and a replayable transcript after a retry. Tool-call and job idempotency are covered. |
| Prompt-injection resistance | ✅ | Tested against a fully compromised model: it can't send, redirect the recipient, reach other tools, or approve. Flags block unacknowledged approval. |
| Correct unsubscribe handling | ✅ | Signed links with a POST confirm. Pending drafts are withdrawn, future drafts and sends are denied, and the handler is idempotent. |
| Correct billing and refund boundaries | ✅ | No refund tool. Payment links need owner or admin approval, and prices come from the catalog, never from input. |
| Safe failure when a tool or API is unavailable | ✅ | Model garbage leads to escalation. Email or payment outages send nothing and keep the approval for a retry. An ambiguous timeout is delivered once. |
| Cost per successful task | ✅ | Reported weekly. The daily agent budget stops model calls. |

## Before the pilot (deployment stage 3)

- ☐ **Decide on a managed auth provider** (Clerk, Auth0, or WorkOS) and implement `AuthProvider`. The local password adapter is acceptable for a single pilot but lacks password reset, MFA, and email verification.
- ☐ Add login rate limiting (per IP and per email). There's none today. A managed auth provider would cover it.
- ☐ **Run the eval set against the real model once, with spend approved.** Target 50 synthetic leads across trades. Measure classification accuracy, flag rate, human edit rate, and cost per lead with `LLM_PROVIDER=anthropic`. Record the results here and review a sample of drafts by hand.
- ☐ **Add a real email adapter** (Resend or Postmark) behind `EmailAdapter`, with a verified sending domain (SPF, DKIM, DMARC). Keep the mock until then.
- ☐ Provision hosting: managed Postgres with point-in-time recovery, the web app, and one worker. Set `APP_SECRET`, both database URLs, and `APP_BASE_URL` (https). See `docs/OPERATIONS.md`.
- ☐ Wire up alerting on `outcome=dead` jobs, `level=error` logs, and health-check failures, to meet TRD §10's under-15-minute target.
- ☐ Add error tracking (for example Sentry) and uptime checks.
- ☐ Test backup and restore once, and record the date.
- ☐ Write a privacy policy and terms for the quote form and the product (customer PII is stored).

## Before charging customers

- ☐ Create Stripe products and prices in **test mode**, set the `STRIPE_*` variables and `FEATURE_STRIPE=true`, and run a checkout end to end with a test card. Confirm the order row appears.
- ☐ Configure the Stripe webhook endpoint (`/api/stripe/webhook`, event `checkout.session.completed`).
- ☐ **Owner sign-off to go live:** switch to live keys and set `ALLOW_LIVE_PAYMENTS=true`.
- ☐ Set up Follow-Up Kit fulfillment. The page promises a download link by email within one business day, and it is **manual** until automated.
- ☐ Subscription billing for RelayFlow at $99/month is **not built** (only one-time checkout and payment links). Until it is, bill pilots through a payment link and approve each one.

## Before publishing marketing

- ☐ Owner review of the landing page and kit copy. It contains no invented results, testimonials, or statistics. Keep it that way until a customer approves a case study (PRD §8).
- ☐ Choose the demo niche. HVAC is the default and is a copy-only change.
- ☐ Set `SALES_FORM_SLUG` to RelayOS's own workspace so audit requests flow through RelayFlow.

## Known limitations

- Follow-up sequences are one step (the first response). Multi-step sequences from the earlier prototype haven't been ported yet.
- CSV import and export from the earlier prototype hasn't been ported yet.
- Master agents (CEO, growth, and so on) exist only as permission profiles. Nothing runs them autonomously, by design, for this slice.
- `packages/content` is a stub. Content tools exist in the registry, but there is no editorial UI.
- The draft guards are heuristics (regex). They catch the common failure shapes; they aren't a proof. Human review stays mandatory.
