# RelayFlow operations runbook

## Launch-gate status (PRD §8)

| Gate | Status |
|---|---|
| A new workspace can be created | Done: `/signup` (test: `test_end_to_end_launch_gate`) |
| A lead can be received and displayed | Done: web form and webhook, lead page |
| An agent can prepare a summary and follow-up draft | Done: `service.prepare_lead` |
| The draft requires approval before sending | Done: `service.send_message` refuses unapproved messages |
| Every action is logged | Done: `audit_log` table, `/audit` |
| Stripe test and production flows are verified | **Manual.** Follow the checklist below in test mode, then live mode. |
| Basic backup and rollback procedures exist | Done: see below |

## Backup

The database is a single SQLite file (`RELAYFLOW_DB`). Take consistent online backups with the backup API. It is safe while the server is running.

```bash
python -m relayflow backup /backups/relayflow-$(date -u +%Y%m%dT%H%M%SZ).db
```

- Schedule it hourly by cron and keep 48 hourly and 30 daily copies.
- Copy the backups off the host (for example to object storage). A backup on the same disk is not a backup.
- Test a restore monthly. Restore into a scratch path, start the app against it with `RELAYFLOW_DB=...`, and log in.

## Restore

1. Stop the app.
2. Move the current database aside: `mv relayflow.db relayflow.db.broken` (also `-wal` and `-shm` if present).
3. Copy the chosen backup into place as `relayflow.db`.
4. Start the app and check `/healthz`, a login, and the latest audit entries.
5. Stripe is the source of truth for billing. After a restore, replay missed webhooks from the Stripe Dashboard (Developers → Events → Resend) for the gap period.

## Deploy and rollback

- Deploy from a tagged git commit. Record the previous tag before each deploy.
- **Take a backup immediately before every deploy.**
- Schema changes are additive only (`CREATE TABLE/INDEX IF NOT EXISTS`, new nullable columns). Destructive database changes (dropping or rewriting columns or tables) need human approval (PRD §6) and a written migration plus restore test.
- **Rollback:** check out the previous tag and restart. Additive schema changes mean the old code runs against the new database. If a deploy corrupted data, restore the pre-deploy backup as described above.

## Stripe verification checklist

Run this once in **test mode** and again in **live mode** before charging customers.

1. Create a Product "RelayFlow" with a recurring $99/month Price. Set `STRIPE_PRICE_ID`.
2. Set `STRIPE_SECRET_KEY` (`sk_test_...` or `sk_live_...`).
3. Add a webhook endpoint `https://<host>/stripe/webhook` with these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Set `STRIPE_WEBHOOK_SECRET`.
4. Enable the Customer Portal in Stripe settings (allow cancel and payment-method update).
5. As a workspace owner, go to Billing → Subscribe and pay with test card `4242 4242 4242 4242`. Expect the status to become `active` and `billing.checkout_completed` to appear in the audit log.
6. Go to Manage billing → cancel. Expect the status to become `canceled` at period end, or immediately if configured, and `billing.subscription_updated` or `billing.subscription_deleted` to appear in the audit log.
7. Pay with the declining card `4000 0000 0000 0341`. Expect `billing.payment_failed`.
8. Send a webhook with a bad signature (for example `curl -X POST .../stripe/webhook`). Expect HTTP 400.
9. In live mode, repeat steps 5–6 with a real card and refund the charge from the Stripe Dashboard. Refunds are human-only (PRD §6).

## Email go-live checklist

1. Run in `RELAYFLOW_MAIL_MODE=outbox` until drafts have been reviewed with the first customer.
2. Configure SMTP with a domain that has SPF, DKIM, and DMARC set up. Use the business's domain or a verified sending domain.
3. Set each workspace's reply-to address so customer replies reach the office.
4. Switch to `RELAYFLOW_MAIL_MODE=smtp`, send one approved message to an internal address, and confirm it arrived and that `message.sent` was logged with the SMTP delivery note.
