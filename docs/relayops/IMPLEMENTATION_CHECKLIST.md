# RelayOps implementation checklist: Lead Follow-Up Setup

**Offer:** Lead Follow-Up Setup, **$1,500 fixed price** (PRD §4). Optional monitoring and tuning is $500/month.

**Promise:** one measurable follow-up workflow live within **7 calendar days** of receiving the access listed in step 1, subject to the customer's approval of every customer-facing message.

**Payment:** use a payment link created through the `create_payment_link` tool. It needs an owner or admin approval, and the price comes from the catalog, not from the agent. Collect payment before day 1.

## 0. Before selling

- [ ] The prospect fits the ICP: 2–30 employees, existing lead volume, and follow-up that is slow or missing.
- [ ] The discovery call covered lead sources, current response time (their own estimate), who answers leads, and which email address customers should reply to.
- [ ] The scope below was sent in writing, and the customer agreed to it.
- [ ] The payment link was paid. Record the Stripe payment ID in the client record.

## 1. Access (day 0–1). The clock starts when this is complete.

- [ ] An owner account in RelayFlow, created by the customer at `/signup`. We never create accounts for them.
- [ ] Access to the website form builder (or its admin), for connecting the webhook
- [ ] A reply-to address for follow-ups, and confirmation that its domain has SPF, DKIM, and DMARC set up (needed before live sending)
- [ ] A named person on their side who will review the approval queue each business day

## 2. Configure (days 1–3)

- [ ] Business profile: services, service area, and hours, in the customer's own words
- [ ] Approved facts: licensing, insurance, warranties, and review claims. **Only what the customer confirms in writing.** Anything not listed is flagged in drafts.
- [ ] Connect lead sources to the workspace webhook (`/api/intake/<token>`), and share the public quote form (`/r/<slug>`) where useful
- [ ] Send 3 synthetic test leads (clearly marked TEST) through each source, and confirm each appears with a summary and draft
- [ ] Confirm drafts contain no prices, arrival promises, or unapproved claims. Check the flags column.

## 3. Pilot (days 3–6). Deployment stage 3: manual approval for every side effect.

- [ ] Train the reviewer on the approval queue (15 minutes): approve, edit, reject, and what each flag means
- [ ] Record the baseline: their typical first-response time before RelayFlow (their estimate, labeled as an estimate)
- [ ] The first real lead is drafted, reviewed by the customer, and sent. Confirm it arrived and the unsubscribe link works.
- [ ] Daily check: the audit log shows no denied tool calls or escalations left unexplained

## 4. Handoff (day 7)

- [ ] Go through the weekly metrics view together: leads, median first response, booked, and lost
- [ ] Hand over a one-page runbook: who reviews approvals, what to do when the agent escalates, and how to update approved facts
- [ ] Offer monitoring and tuning ($500/month). If declined, schedule a 30-day check-in.
- [ ] Ask whether we may write an **anonymized** case study. Get written consent, and only publish numbers from their workspace metrics, never estimates presented as results.

## Acceptance criteria (what "live" means)

1. New leads from their real source appear in RelayFlow within 1 minute.
2. Each lead gets a summary, a quote checklist, and a draft within 5 minutes (unless it has no email).
3. Nothing is sent without their approval, and every send appears in the audit log.
4. The weekly metrics view shows their data.

## Out of scope for the fixed price

- Custom integrations beyond webhook and form
- SMS
- Calendar booking
- Changes to their website design
- Cold outreach of any kind
