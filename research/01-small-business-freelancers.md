# Research 01: Small businesses and freelancers (admin, invoicing, quoting, getting paid)

Date: 2026-10-08. Researcher: agent 01 of 10.

## READ THIS FIRST: limits of this research

This report is thinner and more second-hand than the brief asked for. Do not treat it as a full 40+ source sweep.

- Reddit is blocked for both WebFetch and WebSearch (`reddit.com` is on the not-accessible list). I could not read a single Reddit thread directly. Any "Reddit says" claim below is relayed by a search summary and is secondhand.
- WebFetch failed with DNS errors (`getaddrinfo ENOTFOUND`) on every host I tried: HN, Capterra, Trustpilot, IndieHackers, vendor blogs. I could not open any page and read it. Every quote below comes from search-result summaries, not from my own reading of the page.
- The shared WebSearch budget ran out after about 20 searches. I could not test the second half of my plan. That plan covered photographers, tutors, cleaners, time-tracking leakage, Upwork/Fiverr fees, and solo-lawyer billing.
- Most sources are vendors selling a competing product (alternatives blogs, "stats" pages). I flag that wherever it matters.
- Quotes are as the search tool rendered them. They may be paraphrased by the tool. Verify before reusing them in marketing.
- Market-size, MRR-path and exit statements are my inference, not sourced. They are labelled "Inference".

Net effect: the pain points are real and recurring. Willingness to pay is mostly unproven. Treat the ranking as hypotheses to test with 10 to 20 customer conversations, not as validated demand.

---

## Part 1: Ranked opportunities

Ranking weighs four things: evidence of pain, evidence someone pays today, a buildable solo MVP, and low incumbent strength in the niche.

### 1. Flat-price "refugee" CRM / invoicing / client-portal for ONE niche, triggered by incumbent price hikes (HoneyBook, SimplePractice, QuickBooks, Jobber)

**Problem.** Established small-business tools raised prices sharply in 2025-26, and customers are angry and searching for alternatives. A narrow vertical tool with flat pricing and a one-click importer would catch that switching intent.

**Evidence.**
- HoneyBook: a community post titled "disappointed by recent price hikes a tough blow for small businesses" ([HoneyBook community](https://community.honeybook.com/business-talk-46/disappointed-by-recent-price-hikes-a-tough-blow-for-small-businesses-4320)). A second post is titled "hb i love you but can we stop changing things that arent broken" ([HoneyBook community](https://community.honeybook.com/honeybook-product-talk-7/hb-i-love-you-but-can-we-stop-changing-things-that-arent-broken-5183)).
- Trustpilot, as summarised by the search tool: a reviewer paid annually in Nov 2024, saw the price rise about 2 days later, asked to cancel and refund, and was told to keep the subscription and cancel next year. The summary calls it a single anecdote ([Trustpilot](https://www.trustpilot.com/review/honeybook.com?page=6)).
- One search-result summary says Capterra/G2 averages for HoneyBook stay above 4.4, Trustpilot is 3.5, and BBB is 1.0 ([agiled review](https://agiled.app/blog/honeybook-review)). That is a competitor's blog, so it is weak.
- A competitor table claims hikes of +51% to +89%. I could not verify this against HoneyBook's own pricing.
- SimplePractice: an EHR review site reports a 163% increase in early 2025 (plans from $29 to $49+) ([EHR Source](https://ehrsource.com/articles/simplepractice-problems-2026/)). A Capterra reviewer from Oct 2025 said they were switching because of repeated price jumps and per-claim billing charges (relayed in [Mentalyc](https://www.mentalyc.com/blog/simplepractice-reviews), itself a competing vendor). CostBench claims prices doubled in early 2026 after a private equity acquisition, but the search summary says that rests on one source. Unverified.
- QuickBooks Online: sources agree on price increases in 2026 but disagree on amounts and dates. One says Plus rose to $140 from $115 and Advanced to $340 from $275 for renewals on or after Aug 1, 2026 ([Beancount](https://beancount.io/blog/2026/08/17/quickbooks-online-price-hike-2026-migrate-before-renewal-guide), [Certum](https://www.certumsolutions.com/library/quickbooks-price-increase-august-2026), [Workforce](https://www.workforce.com/news/quickbooks-online-price-increase)). Treat exact figures as unverified.
- Jobber: compiled complaints cover add-on cost creep, refund refusals, and "when they cancelled, all your data is locked away" ([QuoteIQ compilation, a competitor](https://myquoteiq.com/jobber-reviews/)). Pricing is seat-based, with extra users at $29/month per [OneCrew](https://www.getonecrew.com/post/jobber-pricing). That source is also a vendor.

**Who pays and how much.** Solo and micro-practices already pay roughly $20 to $140 a month for these tools (the figures above). Inference: a niche tool at $19 to $39 flat is viable.

**Incumbents and weakness.** Price hikes, feature gating by tier, steep setup (Dubsado "learning curve" per a [Capterra reviewer](https://capterra.com/p/206389/Dubsado/reviews/)), and a poor cancellation experience.

**MVP (1 line).** Pick one niche (e.g. solo photographers, or solo therapists outside US insurance billing) and build intake form, contract e-sign, invoice and payment plan, booking page, plus a CSV importer from HoneyBook/SimplePractice, at flat pricing.

**Competition.** High overall (Dubsado, Bonsai, Studio Ninja, TheraNest, Jane, Carepatron and others appear in the cited results). Medium within a narrow, well-chosen niche.

**Path to $10K MRR (inference).** About 350 customers at $29. Needs SEO and "X alternative" pages plus niche community seeding. Churn will be high if the tool is not sticky. Estimate 9 to 15 months.

**Exit.** Micro-SaaS acquirers (Acquire.com-type marketplaces). I have no sourced multiples. Inference only.

**Confidence: Medium-low.** Price anger is documented. A solo founder matching a full-stack incumbent is the hard part, and the "switchers will pay" assumption is untested.

---

### 2. Client document/information chasing for small accounting and bookkeeping firms

**Problem.** Small firms lose large amounts of time chasing clients for bank statements, K-1s and similar items, over email.

**Evidence** (all vendor-sourced, so weak on magnitude).
- The summary describes the common scene: a staff accountant cannot start the return because February bank statements are missing, and a partner is emailing the same client a third time about a Schedule K-1 ([DEV Community](https://dev.to/arthur_teb/how-accountants-collect-client-documents-without-endless-email-threads-464k)).
- One vendor claims firms lose "nearly 30%" of peak-season time to chasing, and another claims 14.3 partner-hours/week attributed to Thomson Reuters ([US Tech Automations](https://ustechautomations.com/resources/blog/accounting-chase-client-source-documents-before-filing-deadlines-recipe-2026)). I could not verify either number.
- A portal survey stat (64% of firms use portals, attributed to CPA Practice Advisor 2024) is unverified.
- A Skool post tells an 80-hour-weeks anecdote. It is self-reported and from a course seller. Do not rely on it ([Skool](https://www.skool.com/ai-automation-society/accounting-firm-worked-80-hour-weeks-because-clients-sent-documents-2-weeks-late)).

**Who pays.** Accounting and bookkeeping firms, which have budget, unlike freelancers. Price per firm or per client; inference only: $49 to $149 a month.

**Incumbents and weakness.** Practice-management suites with portals exist (TaxDome, Karbon, Canopy, SmartVault; this is my background knowledge and not verified in this session). The gap, per the sources, is that portals store files but staff still chase manually: "a portal that looks good but leaves staff chasing clients in email will not fix the real bottleneck."

**MVP.** Per-client checklist, then automated escalation by email, then WhatsApp/SMS, then a status dashboard. Clients upload with no login. Ship as a lightweight add-on that works beside whatever suite the firm already uses.

**Competition.** Medium to high. Wedge: India (CA firms chasing GST/TDS documents) and a messaging-first (WhatsApp) approach. The wedge is my inference. I did not verify CA-firm pain in this session.

**Path to $10K MRR (inference).** About 100 firms at $99. B2B outbound to small firms is slow but sticky.

**Exit.** Plausible strategic buyer is a practice-management vendor. Inference only.

**Confidence: Medium.**

---

### 3. India-based export freelancer compliance copilot (LUT, FIRC/eFIRA, 15-month realization, GST export invoices)

**Problem.** Indian freelancers billing foreign clients must handle LUT renewal each financial year, FIRC/FIRA collection, purpose codes, and the export-proceeds deadline. Mistakes cost 18% IGST or kill GST refunds.

**Evidence** (vendor and compliance blogs; they sell remittance or compliance services).
- Missing LUT renewal means charging 18% IGST on export invoices from April 1 until a new LUT is filed ([IncorpX](https://www.incorpx.io/blog/gst-export-of-services-freelancers-india)).
- Without a proper FIRA the refund application becomes ineligible. Refund timelines of 30 to 90 days are quoted ([Skydo](https://www.skydo.com/receive-international-payments-in-india/from-freelancer), [Winvesta](https://www.winvesta.in/blog/freelancers/7-things-freelancers-must-do-before-march-31-2026), [IncorpX software export guide](https://www.incorpx.io/blog/software-export-gst-firc-rbi-compliance)).
- One vendor says Freelancer.com gives only a remittance advice and not a FIRA, so you raise a FIRC at the bank at about ₹300 to ₹500 each and about a week's wait ([Skydo](https://www.skydo.com/receive-international-payments-in-india/from-freelancer)). That is a vendor claim.
- One guide says export proceeds must be realised within 15 months, extended from 9 months by an RBI amendment dated 13 Nov 2025 ([Wisemonk](https://www.wisemonk.io/blogs/is-it-legal-to-freelance-for-foreign-companies-from-india-fema)). That rests on a single vendor blog. Verify with RBI.

**Who pays.** Indian freelancers and small agencies (low price tolerance), plus CA firms (better). Inference: ₹299 to ₹999 a month for freelancers, or per-client pricing to CAs.

**Incumbents and weakness.** Skydo, Wise, Xflowpay, Winvesta and others monetise the remittance spread and give compliance content free. Invoicing apps (Refrens, Zoho) are not export-compliance-first. I did not review them in depth.

**MVP.** Ingest the invoice and bank/PayPal statements, track LUT validity, FIRC status per invoice, and the realization deadline. Generate a GST-compliant export invoice and a CA-ready refund file.

**Competition.** Medium, with free alternatives from the remittance players. Advantage: you are in-market.

**Path to $10K MRR (inference).** About ₹8.3 lakh a month at current exchange rates is about $10K. That needs roughly 1,000 freelancers at ₹800, which is hard. A CA-firm channel is more realistic: about 100 CA firms at ₹8,000.

**Exit.** Strategic buyer could be a fintech like those above. Inference only.

**Confidence: Low-medium.** The pain is real but the payer is price-sensitive and the free competitors are well funded.

---

### 4. Post-quote follow-up and estimate-to-close automation for home-service trades (SMS/WhatsApp first)

**Problem.** Contractors send estimates, then hear nothing. Follow-up is inconsistent, and speed of response decides who wins.

**Evidence** (mostly marketing sources; the direction is plausible, the numbers are not proven).
- A podcast argues "Contractors don't lose jobs because of price, they lose them in the silence that happens after the quote is sent" ([Audible/Build to Win](https://www.audible.co.uk/podcast/Build-to-Win-Podcast/episodes/B0H6KCF3KT)).
- A vendor claims 40% of estimates never get a single follow-up, with no source ([Enterprise DNA](https://enterprisedna.co/resources/blog/trades-stop-losing-estimates-competitors)). Treat as unverified.
- Another vendor repeats "21x more likely to close within 5 minutes", citing an MIT / InsideSales.com study. That study is about lead response, not estimate follow-up ([Footbridge Media](https://www.footbridgemedia.com/marketing-tips/losing-jobs-contractor-follow-up-fix)). Unverified.
- Quote tools exist at $15 to $249+/month ([Capterra category page](https://www.capterra.com/quoting-software/)).

**Who pays.** Solo and small trades (plumbers, landscapers, roofers, painters). Inference: $39 to $99 a month.

**Incumbents and weakness.** Jobber, Housecall Pro, ServiceTitan have follow-ups, but gated to higher tiers. For example, Fieldproxy notes two-way texting needs the Grow plan or above ([Fieldproxy](https://www.fieldproxy.ai/fsm-software-pricing/jobber)). Trades often use pen, paper, WhatsApp and a spreadsheet.

**MVP.** Forward or paste a quote, and the tool sends automatic, human-sounding SMS/WhatsApp nudges on days 1, 3, 7 and 14 until the customer replies, with a one-tap "accepted" link. It works without replacing their invoicing tool.

**Competition.** Medium. The crowded adjacent segment is AI receptionists (see rejected ideas).

**Path to $10K MRR (inference).** About 250 trades at $39. Needs cold outreach or Facebook groups, which is slow, and SMS costs eat margin.

**Exit.** Low to medium.

**Confidence: Low-medium.** The pain is plausible but I found no first-hand complaint from a contractor.

---

### 5. Poland-first (then EU) sole-trader e-invoicing "just make it work" (KSeF, Peppol)

**Problem.** EU e-invoicing mandates are landing on sole traders with deadlines.

**Evidence.**
- Poland: KSeF has been mandatory for large firms since Feb 1, 2026 and for other VAT-registered businesses since April 1, 2026. The smallest sellers (up to PLN 10,000 monthly invoiced sales) are optional through 2026 and mandatory from Jan 1, 2027. One source says penalties are waived through 2026 ([VATupdate](https://www.vatupdate.com/2025/12/02/how-can-sole-proprietors-issue-invoices-in-ksef-steps-and-options-explained/), [easybooks.pl](https://easybooks.pl/ksef-implementation-for-small-businesses-in-2026/), [Terminovo](https://www.terminovo.pl/en/ksef-guide/)). Dates differ between sources.
- A WBJ headline reads "KSeF adding to problems for sole proprietors" ([WBJ](https://wbj.pl/ksef-adding-to-problems-for-sole-proprietors/post/149776)). I could not open the article and have only the headline.
- Belgium went live Jan 2026, France phases from Sept 2026 with SMEs later, and Germany requires issuing from 2027/2028 ([SPS Commerce guide](https://www.spscommerce.com/community/articles/e-invoicing-mandates-in-europe-the-2026-business-guide), [Invoice Navigator](https://www.invoicenavigator.eu/answers/eu-e-invoicing-requirements-2026)). Sources conflict on small-business dates.

**Who pays.** Sole traders and micro firms. They pay now for local invoicing software (Polish names such as wFirma, Fakturownia and InFakt come from my memory and are not verified here).

**MVP.** A free-to-start invoice generator that emits compliant KSeF/Peppol XML with an accountant-share link. Polish-language localisation is required.

**Competition.** High in Poland, because local incumbents move fast and have bank and accountant distribution. Language and trust are real barriers for an India-based solo founder.

**Path to $10K MRR (inference).** About 500 users at €20. Mandate deadlines create a spike but also invite fast incumbents.

**Exit.** Unclear. Inference: regional buyers.

**Confidence: Low.** Real regulatory trigger, but a poor founder-market fit.

---

### 6. UK Making Tax Digital for Income Tax "simple quarterly updates" for sole traders on spreadsheets

**Problem.** MTD for Income Tax started 6 April 2026 for self-employed and landlords above £50,000, falling to £30,000 in April 2027 and £20,000 in April 2028 ([UKFT](https://ukft.org/mtd-april26), [Beancount guide](https://beancount.io/blog/2026/08/13/making-tax-digital-income-tax-april-2026-uk-guide), [GM Chamber](https://www.gmchamber.co.uk/news-opinions/member-news/making-tax-digital-for-income-tax)). The thresholds come from secondary sources, so verify them on GOV.UK.

**Evidence.**
- ICAEW warned of "significant costs and additional administrative burden for taxpayers in return for limited benefit to HMRC" ([Accountancy Age](https://accountancyage.com/2025/03/18/icaew-marks-10-years-of-mtd-with-fresh-concerns/)).
- A commentator cited the cheapest software at £150 a year in 2025, and doubted HMRC's 35-minute estimate per quarterly update (same source).
- One guide says HMRC will not apply penalty points for late quarterly updates in the first year (2026 to 2027) ([Beancount](https://beancount.io/blog/2026/08/13/making-tax-digital-income-tax-april-2026-uk-guide)). That weakens urgency this year.

**Who pays.** UK sole traders and landlords. Plausible price £5 to £15 a month.

**Competition.** High: Xero, QuickBooks, FreeAgent and many cheap or free bridging tools (existence from my background knowledge, not verified here). HMRC software recognition is also a barrier for a solo build.

**Confidence: Low.** Large wave, but a crowded market with an accreditation hurdle. Listed to show the idea was considered.

---

### 7. Payment chasing sold to the people who chase for others (bookkeepers, agencies, B2B small firms), not to individual freelancers

**Problem.** Chasing overdue invoices is emotionally awkward and gets skipped.

**Evidence (pain is real, willingness to pay for solo freelancers is doubtful).**
- Freelancers' Union / Authors Guild NY survey (2022, primary): 62% of NY freelancers lost wages to non-payment at least once; 51% of those lost more than $1,000; 22% more than $5,000 ([Authors Guild](https://authorsguild.org/news/survey-finds-62-percent-of-ny-freelance-workers-have-lost-wages-due-to-nonpayment)). The "71% have struggled to collect" figure comes through Fiverr's blog and is secondary.
- Bonsai analysis of over 100,000 freelancers: 29% of invoices paid at least one day late (reported in a search summary; I did not open the primary source).
- HN threads: "the real hard part is getting clients to actually pay on time"; "after a non-payment dispute for months I couldn't focus on work" ([HN 24972066](https://news.ycombinator.com/item?id=24972066), [HN 37318898](https://news.ycombinator.com/item?id=37318898)). Wording is from the search summary. Another HN poster said invoicing and chasing "had cost them a large amount over the years, mostly through invoices that were never sent".
- Indie Hackers: "sending an invoice is easy... the actual pain is chasing people who ghost you" and "the follow-up cadence is the biggest time sink, because each reminder feels like a fresh decision" ([IH: Chasing overdue invoices is awkward](https://www.indiehackers.com/post/chasing-overdue-invoices-is-awkward-i-built-a-small-tool-to-automate-reminders-4f89bae266)). Unsent invoices: [IH post](https://www.indiehackers.com/post/i-built-an-invoicing-app-because-i-kept-doing-the-work-and-never-sending-the-bill-7eNX2FwGKRYNwSYnU0Pd).
- Counter-evidence, important: a founder found 71 Reddit threads and 89 mentions of invoice stress, but "not a single person mentioned wanting to pay", and scored the idea 2.2/10 ([IH](https://www.indiehackers.com/post/i-found-71-people-complaining-about-the-same-problem-not-one-would-pay-to-fix-it-209e2bf18e)). The score comes from the author's own tool and the post is self-reported.
- HN consensus per a summary: "the tools are not the hard part", and many use QuickBooks, FreshBooks or Harvest.

**Incumbents.** Every invoicing app has reminders (Vyapar, Swipe, Zoho, FreshBooks, QuickBooks). In India, Vyapar's own guide recommends reminders 7 days before, on the due date, and 2 days after ([Vyapar guide](https://vyaparapp.in/guides/how-to-send-payment-reminders-in-vyapar)). Swipe says Zoho Invoice and Refrens lack native WhatsApp integration ([Swipe blog](https://getswipe.in/blog/collections/8-best-tools-to-send-invoices-through-whatsapp-in-india)). That is a competitor's claim.

**Who pays.** Only B2B payers with recurring receivables. Do not sell to individual freelancers.

**MVP.** An accounts-receivable chaser for small agencies and bookkeeping firms: connect Stripe, QuickBooks or Xero, send tone-controlled WhatsApp/email reminders, and escalate to a demand letter.

**Competition.** High (accounting-suite features plus dedicated AR tools).

**Confidence: Low.** Pain proven; payer unproven; counter-evidence documented.

---

### 8. Google Business Profile suspension monitor and appeal service for local businesses

**Problem.** Suspended listings with vague reasons, automated denials and no human support.

**Evidence.**
- "Waves of GBP Suspensions Reflect Google Support Failures" ([NearMedia](https://nearmedia.co/waves-of-gbp-suspensions-reflect-google-support-failures)). Another summary quotes a Reddit user: only "two chances to figure it out with no support, help, or explanation".
- A Toronto firm estimated about $61,800 in lost sales after suspension ([Globe and Mail](https://arc-dev.theglobeandmail.com/business/article-small-businesses-rely-on-google-for-customers-but-struggle-to-reach)). Single anecdote.
- Consultants already sell reinstatement (e.g. press release from [Reinstate Labs](https://kdhnews.com/online_features/press_releases/reinstate-labs-reports-sharp-rise-in-google-business-profile-suspensions-hitting-local-businesses-nationwide-and/article_1a5fc3d4-d429-5e3f-856b-9c4d2f0f3ee1.html)), so there is revealed demand for services, but the pricing is unknown to me.

**MVP.** Daily profile-status monitoring, an alert on edits/suspension, a compliant-edit checklist to avoid triggers, and a templated appeal pack.

**Competition.** Low for the SaaS form. The service form is crowded with consultants. Risk: Google can change policies at will, and you depend on an API you do not control.

**Who pays.** Local SEO agencies would buy monitoring for many clients. Inference.

**Confidence: Low.**

---

### 9. Payment-processor hold survival kit (Stripe/PayPal freezes) for micro-merchants

**Problem.** Funds frozen, vague reasons, canned support replies.

**Evidence.** BBB complaint of funds held 6+ months after an Oct 2024 freeze; a Reddit user told to wait 120 days then given new reasons to wait; a $38K freeze for a small course business ([terms.law](https://terms.law/2025/03/03/when-stripe-holds-your-money-the-definitive-legal-guide-to-getting-your-funds-released)). The source is a law-firm site that sells demand-letter services. A UK Financial Ombudsman decision upheld Stripe's right to hold funds as security ([DRN-6173795](https://www.financial-ombudsman.org.uk/decision/DRN-6173795.pdf)).

**Why low.** Stripe account holds are mostly triggered by risk, which makes this a legal and financial-services niche, not a clean SaaS. The product would be a document pack plus failover routing. It is hard to monetise recurring. Listed for completeness.

**Confidence: Very low.**

---

## Part 2: Rejected ideas and why

| Idea | Why rejected |
|---|---|
| AI receptionist / missed-call text-back for trades | Crowded, and Jobber already bundles an AI Receptionist at $99/month per [Fieldproxy](https://www.fieldproxy.ai/fsm-software-pricing/jobber). The oft-quoted $250 to $500 lost per missed call, 62% unanswered and 85% no-callback figures all come from vendors with no methodology ([Ring4](https://ring4.com/blog/real-cost-of-missing-calls)). |
| Generic freelancer invoice-chasing app (B2C) | Documented zero willingness to pay in the IH validation post above. Every invoicing tool already has reminders. Many HN commenters say the tools are not the problem. Folded into #7 as a B2B variant. |
| Generic invoicing / quoting software | Saturated. Capterra lists entry quoting plans at $15 to $249+/month ([Capterra](https://www.capterra.com/quoting-software/)). GummySearch's Reddit ranking shows Wave and Xero at about 4.6/5 ([GummySearch](https://gummysearch.com/tools/best-products/invoicing-software/)), so free or cheap options already satisfy many. |
| Scope-creep / change-order tool | Plenty of advice content, no sign of anyone paying for software. Sources are marketing posts that sell templates ([Plutio](https://www.plutio.com/freelancer-magazine/scope-creep), [DEV](https://dev.to/penloom_studio_829b7817d3/the-polite-sentence-that-stops-scope-creep-before-it-eats-your-week-5aj6)). Better as a feature than a product. |
| WhatsApp collections bot for Indian SMEs | Consent and spam backlash risk: TechCrunch and Rest of World report people calling unsolicited business WhatsApp messages harassment ([TechCrunch](https://techcrunch.com/2022/10/10/in-india-businesses-are-increasingly-spamming-users-on-whatsapp/), [Rest of World](https://restofworld.org/2022/india-whatsapp-spam/)). Meta template approval also constrains it, and Vyapar/Swipe already do it. I found no documented Vyapar/Khatabook/Refrens complaints either. |
| India GST e-invoicing tool | The mandate applies only above ₹5 crore AATO, and small businesses are largely outside it ([Gimbooks](https://www.gimbooks.com/blog/5-crore-e-invoice-turnover-rule-2026/amp/)). The affected firms already use ERPs. |
| Generic "Stripe freeze" product | See #9 above. |

---

## Part 3: What I could not verify

1. First-hand Reddit complaints. Reddit is blocked, so every Reddit reference is relayed by a search summary.
2. Page-level reading of any source. WebFetch failed on every host, so I never opened Capterra, G2, Trustpilot, App Store, HN or IH pages myself. The quotes depend on the search tool's rendering.
3. Willingness to pay for any idea. Except for existing tool prices from vendor pages, I found no evidence that the target buyers would pay a specific price.
4. The accuracy of nearly all numeric "stats": 62% unanswered calls, $250 to $500 per missed call, 40% of estimates never followed up, 30% of accountant time, 14.3 hours per week, 64% portal adoption, 85% of freelancers paid late. All are vendor-sourced or unattributed.
5. Exact price-hike figures for HoneyBook (+51% to +89%), SimplePractice (163%, and doubling in 2026), and QuickBooks Online (sources conflict).
6. Regulatory dates: the 15-month RBI realization window, the Polish KSeF dates and penalty waiver, the French and Belgian grace periods, and MTD thresholds. All are secondary sources, so check the official pages before building.
7. Incumbent names I used from background knowledge and did not verify this session: TaxDome, Karbon, Canopy, SmartVault, Polish invoicing vendors, FreeAgent.
8. Anything about photographers, tutors, cleaners, solo lawyers, landlords, time-tracking leakage, Upwork/Fiverr fees and contracts/e-signature pricing. These were planned but the search budget ran out.
9. All MRR paths and exit valuations. They are my arithmetic and judgment, not sourced.

## Suggested next steps (cheap validation, inference)

- Re-run this research with Reddit access and page-fetch working, targeting the niche behind #1 (the price-hike refugees) and #2 (document chasing).
- For #2 and #3, book 10 interviews each: small accounting or CA firms, and Indian export freelancers. Ask what they pay today and what they last switched away from.
- Put up a pre-sale landing page for the best candidate before writing code.
