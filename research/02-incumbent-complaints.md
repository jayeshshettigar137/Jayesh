# 02 - Incumbent Software Complaints: Where a Narrow, Cheap Replacement Could Win

Date of research: 2026-10-08. Author: research agent 02 of 10.

## READ THIS FIRST: limits of this report
- Only about 20 web searches ran. The shared search budget (200 per turn across all agents) ran out mid-session, so several planned queries never ran. These include Zendesk Sell retirement, the Sanka EOL calendar, Salesforce, and G2 and Trustpilot deep-dives.
- WebFetch could not reach Reddit, Hacker News, Capterra, IndieHackers or intuit.com (DNS or block errors). I never read a primary Reddit, HN, G2 or Trustpilot page.
- Every quote below is a snippet returned by the search tool's summary of a page. Many come from competitor vendor blogs. Treat them as second-hand.
- The search tool is US-focused. India-specific evidence is very thin.
- The evidence is weaker than the brief asked for. The ranking is a hypothesis list that needs validation, not a finished verdict.

Key finding: the big, loud, hated incumbents (HubSpot, QuickBooks, Mailchimp, Mindbody, Intercom, Airtable, Typeform, ServiceTitan) are already surrounded by dozens of "alternative to X" vendors. Complaints are real, but a solo founder entering head-on faces heavy competition. The best openings I found are event-driven: a product shut down or was retired on a date, which creates a time-boxed pool of buyers. That is also the weakness. These windows close, and the buyers are often one-time.

---

## 1. Ranked opportunities

### 1. Cap-table / equity tool for tiny and non-US startups (Pulley shutdown, Carta pricing)
- **Problem:** Pulley is closing and handing customers to Carta, which founders say is costly and quote-priced.
- **Evidence:**
  - Search summary of coverage: "Pulley will stop all operations and services on December 8, 2026", with an opt-in deadline of Nov 30 and limited data access to Jan 31, 2027. Sources: https://www.cakeequity.com/guides/pulley-explainer, https://blog.colonialstock.com/pulley-shutting-down-cap-table/, https://technori.com/2026/09/26858-cap-table-software-pulley-shutdown-carta/mquill/, https://x.com/AGTPinsights/status/2099938248030380508
  - Carta pricing complaint (WEAK, vendor-affiliated blogs): "Carta customers really pay about $15,400 a year, well above its $2,988 list price." I did not verify this. It came via the search summary of cap-table comparison posts such as https://www.ellty.com/blog/carta-alternatives
  - Pulley pricing as reported: Startup plan about $1,200 per year for up to 25 stakeholders.
- **Who pays and how much:** Seed-stage founders and their lawyers or CAs, roughly $500-$3,000 per year per company. A $10K MRR target needs about 100 companies at $100 per month.
- **Incumbents and weakness:**
  - Carta: expensive and quote-based.
  - Cake Equity: free for up to 5 stakeholders, paid from about $1,000 per year.
  - Eqvista, Ledgy, Qapita, Capboard, Carta Launch: Carta Launch is free under 25 stakeholders, then $149 per month.
  - Weakness: gaps for India-incorporated companies (ESOP rules, Indian valuations), which I could not verify.
- **MVP idea:** Pulley-export importer plus a clean cap table, vesting and SAFE ledger for Indian and US-Delaware startups, priced flat at about $29-49 per month.
- **Competition:** High and growing. Eight or more named alternatives already target "Pulley refugees".
- **Path to $10K MRR:** Hard. This needs ESOP and compliance depth, and trust matters because it is a legal system of record. The shutdown window ends Dec 2026.
- **Exit potential:** Low-moderate. An acqui-sale to a cap-table or legal-tech player is possible. A speculation in the sources says AI makes cap tables easy to DIY, which would shrink the market (unverified).
- **Confidence: LOW-MEDIUM.** The event is verified, but demand size and willingness to switch from free tiers are not.

### 2. Microsoft Publisher (.pub) rescue: converter and web editor
- **Problem:** Publisher support and inclusion in Microsoft 365 ends Oct 2026. Sources disagree on Oct 1 versus Oct 13. Microsoft's suggested replacements are Word and PowerPoint.
- **Evidence:**
  - BetaNews calls the suggested alternatives "laughable" (via search summary): https://betanews.com/topic/publisher-alternative
  - Date discrepancy: https://office-watch.com/?p=65340 (Oct 13), https://www.techspot.com/news/101964-microsoft-goodbye-publisher-2026.html
  - University guidance on file conversion: https://www.mun.ca/cio/news-articles/microsoft-publisher-end-of-life-in-october-2026-preparing-your-files-and-choosing-alternatives.php
  - One source warns that ".pub format ... is unlikely to be supported by other software" (https://www.ramsac.com/blog/microsoft-publisher-retirement-2026-what-it-means-and-your-alternatives/).
- **Who pays and how much:** Small shops, schools, churches, clubs and local print businesses. These are low-ticket buyers, likely $5-20 per month or per conversion batch. Institutions may pay for bulk conversion.
- **Incumbents and weakness:** Microsoft's own PowerShell script needs a licensed copy of Publisher. Canva, Affinity and Scribus are general-purpose and not .pub-aware. I did not search for existing .pub importers, so I cannot say whether the gap is real.
- **MVP idea:** A browser tool that takes .pub files, preserves layout, and exports an editable design (SVG or PDF with editable text) or a Canva-style template.
- **Competition:** Unknown. Parsing .pub is hard, and that may be the moat or the reason nobody has done it.
- **Path to $10K MRR:** Doubtful. The pain is a one-time spike, and consumer ARPU is low. It works better as a $50K-$150K one-time asset or SEO play than as a $10K MRR business.
- **Exit potential:** Low (a small acquisition by a design tool is plausible, and unverified).
- **Confidence: LOW.** Demand is real but monetization is weak.

### 3. QuickBooks refugees: migration and "history-preserving" switch tool for small accounting firms
- **Problem:** Repeated QuickBooks Online price hikes (renewals on or after Aug 1, 2026, plus a separate payroll increase and UK increases) push small firms to switch. But "None of these are drop-in replacements".
- **Evidence (search-tool summary of Intuit community posts and blogs):**
  - A bookkeeping firm posted a table showing its bill rising from "about $1,106 in 2021 to $4,149 in 2026" and said the pricing "is no longer affordable". Source thread: https://quickbooks.intuit.com/community/other-questions-36/2026-massive-price-increase-110464 (I could not open it, so this is second-hand).
  - Payroll: "QuickBooks Payroll ... got its own ~20% increase". Reported by https://beancount.io/blog/2026/07/26/quickbooks-online-price-increase-2026-cost-breakdown-guide (a vendor blog).
  - ACH fees doubled (from $3 to $5, and $5 to $10): same source.
  - A UK accountant: "No good jumping ship to Xero as they are even worse." https://www.accountingweb.co.uk/node/227559
  - Another thread: "longtime customer deeply disappointed by quickbooks pricing and forced migration", https://quickbooks.intuit.com/community/other-questions-9/longtime-customer-deeply-disappointed-by-quickbooks-pricing-and-forced-migration-90743 (title only, unread).
  - Price numbers conflict across sources (Advanced shown as $235, $250, $275 or $340), so do not rely on any of them.
- **Who pays and how much:** Bookkeepers and small CA firms with 20-200 clients, roughly $30-100 per month per firm for a migration or reconciliation tool, or a per-client fee.
- **Incumbents and weakness:** Xero, FreshBooks, Wave, Zoho Books (free under $50K revenue per one source). Weakness: none preserves full audit trail, and migration is manual.
- **MVP idea:** Upload QBO exports and get a clean import into Zoho Books or Xero, with mapping checks and reconciliation diff.
- **Competition:** Medium. Dext, Transferwise-style tools and conversion services exist. I did not check them.
- **Path to $10K MRR:** Plausible but migration is episodic, so MRR needs a second recurring feature such as a recurring bookkeeper-reporting layer. About 150-300 firms.
- **Exit potential:** Low-moderate.
- **Confidence: LOW-MEDIUM.**

### 4. Flat-rate AI helpdesk for small SaaS or ecommerce (Intercom Fin per-resolution backlash)
- **Problem:** Fin charges about $0.99 per resolution on top of seats. The billing rules are the pain.
- **Evidence (search-tool summaries):**
  - Capterra reviewer: "Intercom is expensive, especially for startups and small businesses. Their AI agent, Fin, charges about $0.99 per resolution, which adds up quickly at scale." https://www.capterra.com/p/134347/Intercom/reviews/
  - Analysis: a customer who reads Fin's answer, "decides it is useless, and closes the tab has generated a billable outcome". https://qualimero.com/en/blog/intercom-chatbot-pricing-2025-per-resolution-fails
  - A vendor cost model: "at 30,000 conversations the outcome charge is $20,790 of a $23,760 invoice". https://myaskai.com/blog/intercom-fin-cost-at-scale (vendor claim)
- **Who pays and how much:** Small teams paying $50-300 per month.
- **Incumbents and weakness:** Tidio Lyro ($79 per month per one source), Crisp, Chatwoot, Help Scout ($0.75 per resolution). The market is flooded.
- **MVP idea:** Flat-fee help-center chatbot with a hard monthly cap and no per-resolution billing.
- **Competition:** Very high. Dozens of AI support bots.
- **Path to $10K MRR:** Possible, but customer acquisition is the issue, not product.
- **Exit potential:** Moderate, but you need real traction.
- **Confidence: LOW.** The complaint is real but the space is saturated.

### 5. Per-transaction fee backlash in vertical payroll (Wrapbook, film and production)
- **Problem:** A small production company said Wrapbook's per-transaction fee went "from $0.99 to $8 [in 2024], then to $18 in 2025".
- **Evidence:** Appeared in a search summary that pointed to https://g2.com/products/wrapbook/pricing. I never read the page, so it is a single unverified review.
- **Who pays and how much:** Indie film and commercial production companies, with unknown spend.
- **Incumbents and weakness:** Wrapbook, Cast & Crew, Entertainment Partners. Payroll is a regulated space and expensive to enter.
- **MVP idea:** None viable for a solo founder without a compliance partner. Possibly a transparent fee calculator or comparison.
- **Competition:** Unknown.
- **Path to $10K MRR:** Unclear.
- **Exit potential:** Low.
- **Confidence: VERY LOW.** Included only because it is a rare concrete example of a fee that rose 18x. One uncorroborated review.

### 6. Project Online refugees: lightweight Gantt and .mpp migration tool
- **Problem:** Microsoft Project Online shut down Sept 30, 2026, with "a hard stop, not a phased sunset". One guide says migration "could take up to 20 weeks".
- **Evidence:** https://www.velosio.com/blog/microsoft-project-online-retirement-what-to-do-before-september-30-2026/, https://easi.its.utoronto.ca/project-online-retiring-september-30-2026. The searcher found no direct small-firm complaints. The "unused features" claim comes from a vendor (Morningmate): https://morningmate.com/m/blog/microsoft-project-online-alternatives
- **Who pays and how much:** Small consultancies and construction firms that used Project Online. Unknown size.
- **Incumbents and weakness:** Microsoft Planner (weak for Gantt), Asana, Monday, Wrike, Oracle Primavera.
- **MVP idea:** Import Project Online exports into a simple, cheap Gantt with resource view.
- **Competition:** High (Smartsheet, TeamGantt, ProjectLibre).
- **Path to $10K MRR:** Window has already passed (today is Oct 8). Low.
- **Exit potential:** Low.
- **Confidence: LOW.**

### 7. Switching-cost tools for studios and clubs leaving Mindbody (rejected-leaning, kept for the data)
- **Evidence:** Complaints are loud and well documented but only through secondary summaries: "Cancellation requires a phone call, your client ID, security question answers, and 30 days' notice", and "Mindbody no longer publishes pricing" (https://vibefam.com/mindbody-reviews-reddit-2026/ via search summary). Others claim 24-month contracts are the top G2 complaint (https://gymdesk.com/blog/is-mindbody-worth-it, a competitor).
- **Competition:** Very high. Glofox, Punchpass, Gymdesk, Rezerv, Koalendar, OfferingTree, Momence and more already fight for these buyers.
- **Confidence: LOW.** See "Rejected" below.

### 8. Cheap alternative for the shutdown of NPS and feedback tools (Delighted, closed June 30, 2026)
- **Evidence:** "Qualtrics retired the product on June 30, 2026 ... accounts have been closed and customer data is being deleted" (summary of https://www.jotform.com/blog/delighted-alternatives/ and https://www.featurebase.app/blog/delighted-alternatives).
- **Why low:** The window has passed and Zonka, Survicate, Retently, AskNicely and others already compete.
- **Confidence: LOW.** See "Rejected."

---

## 2. Rejected ideas and why
- **HubSpot / Zoho / Pipedrive CRM alternative.** Complaints exist ("The pricing model has changed three times since you signed up", via a competitor's blog; Capterra reviewers: "Too expensive for startup businesses"). But hundreds of cheap CRMs exist (Less Annoying CRM, Bigin, EngageBay, Freshsales). I found no evidence of an uncovered niche. Source: https://alternativeto.net/software/hubspot/?p=2
- **Mailchimp alternative.** Real backlash (free tier cut and price rises, claimed 11-13% for legacy accounts; sources conflict on contact limits). Already saturated (Brevo, MailerLite, Omnisend, Kit, beehiiv). Source: https://www.omnisend.com/blog/mailchimp-pricing-increase/
- **Airtable alternative.** The per-seat complaint is real (community forum), but Baserow, NocoDB, Fillout, Aitable and Zoho Tables exist. Source: https://community.airtable.com/announcements-6/updates-to-our-pricing-plans-1517/index2.html
- **Form builder (Typeform/Jotform).** Tally is free and unlimited, and wins on price. No room.
- **Field-service software (ServiceTitan, Jobber, Housecall Pro).** The complaints (contracts, opaque pricing, a claimed $39,375 early-termination fee) come from vendor-adjacent blogs and I could not verify them. Many competitors exist. Source: https://pipelineon.com/blog/servicetitan-alternative/
- **Payroll (Gusto, Rippling, Paychex).** I found no 2026 fee-hike notice. Regulated and capital-heavy.
- **Frame.io per-seat alternative.** The complaint is real. Reel ($49 per month unlimited users), Fast.io, Wipster, Filestage and MediaSilo exist. Source: https://pie.gravitywell.xyz/c/technology/p/83273/i-got-sick-of-frame-io-s-per-seat-pricing-trap-so-i-built-a-flat-rate-alternative
- **Atlassian price rises (Cloud +7-8% from Oct 13, 2026; Data Center end of life Mar 2029).** Modest increases. The migration pool is enterprise and partner-driven. Not solo-friendly. Source: https://www.atlassian.com/licensing/future-pricing/cloud-pricing/faqs
- **Tally Prime (India) alternative.** I found no evidence of a price hike or loud complaints. Pricing is public (Silver Rs 22,500 + GST; renewal Rs 4,500 per year, from Tally's own page https://tallysolutions.com/business-guides/tallyprime-total-cost-of-ownership-india/). Untested, not rejected on evidence.
- **Microsoft Access.** Not discontinued. Only the Database Compare tool and old versions are retiring. Source: https://help4access.com/microsoft-access-end-of-life/
- **Delighted replacement.** See opportunity 8.

---

## 3. What I could not verify
- Any first-hand Reddit, HN, IndieHackers, G2, Trustpilot or App Store 1-3 star review. Fetches failed and the search tool surfaced mostly vendor blogs.
- Exact QuickBooks prices after Aug 2026. Sources conflict.
- The Carta "$15,400 per year" actual-spend claim, and the ServiceTitan "$39,375" termination fee and "5-15% renewal increases". Both are unsourced estimates from competitor blogs.
- The Publisher cutoff date (Oct 1 or Oct 13).
- Whether any good .pub importer already exists.
- Whether Indian customers have real unmet needs in cap tables, accounting or GST tooling. The search tool did not surface Indian forums.
- A claim that "Custom GPTs retire December 11" (from sitespeak.ai, via a search summary). It looks like a vendor marketing page, I could not confirm it, and I made no use of it.
- Items I identified but could not research further because the search budget ran out: Zendesk Sell retirement (listed with data deletion starting Aug 31, 2027, per https://sanka.com/docs/ferry/eol/, unread), Meta Workplace shutdown (Wikipedia: https://en.wikipedia.org/wiki/Workplace_(software)), Productiv sunset (Aug 6, 2026, https://www.toriihq.com/blog/why-did-productiv-shut-down), Affixa retirement (Jan 31, 2027, https://help.affixa.com/article/100-sunsetting-and-retirement-of-affixa), Nintex on-prem end of life, Best Practice Software VIP.net (Australian medical software, maintenance mode Dec 31, 2026, https://digital.mivision.com.au/collections/mivision-journal-august-2026/bp-software-sunsets-vip-and-allied-platforms).
  - Zendesk Sell (SMB CRM, 2027 forced migration) is the most promising unexplored lead. It deserves a follow-up search.

## Recommended next steps for whoever continues
1. Re-run with a fresh search budget on: Zendesk Sell refugees, Sanka's EOL calendar, Meta Workplace refugees, and small-practice vertical software with forced migrations (VIP.net-style).
2. Validate by reading primary threads on r/smallbusiness, r/Accounting, r/sysadmin and the Intuit community, and by searching G2 and Trustpilot for 1-2 star reviews with "price increase" or "renewal".
3. Test demand cheaply (landing page plus Google Ads on "pub to canva" or "pulley export" style keywords) before building.
