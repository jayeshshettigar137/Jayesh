# 05 - Regulation-driven markets (as of 2026-10-08)

## Read this first: method limits

- I ran about 19 web searches (extended mode). Then the shared web-search budget ran out (limit of 200 per turn, shared by all parallel agents). The brief asked for 40+ searches or fetches, so this report is thinner than requested.
- WebFetch and curl failed on every host I tried (DNS failure for WebFetch, proxy 403 for curl). I could not open any regulator page, EUR-Lex or Official Journal text myself.
- Where a regulator or institution page (Council, Commission, ENISA, EP) appeared in search results and the search tool summarised it, I cite that page and mark it "primary page seen in search". Everything else is law-firm or vendor commentary, marked "secondary".
- Vendor blogs are the main source for "demand" claims. They are biased toward selling tools, so treat all market-size numbers as unproven.
- Not covered because search ran out: ADA Title II web rule, COPPA/age-verification laws, California SB 253/261, Gulf/Malaysia e-invoicing, EU Data Act, TAKE IT DOWN Act. Details are in section 4.
- Several dates below differ between sources. Those are flagged "CONFLICT".

---

## 1. Verified deadline table

Status key: **LIVE** = already binding. **AHEAD** = real date still in the future. **MOVED** = postponed. **SUSPENDED** = paused or dropped. **UNCONFIRMED** = sources disagree or no primary source seen.

| Regulation | Who it hits | Current date status (2026-10-08) | Source (quality) |
|---|---|---|---|
| EU AI Act, Digital Omnibus on AI | Providers and deployers of high-risk AI (HR, credit scoring, education, etc.) | **MOVED.** Annex III stand-alone high-risk now 2 Dec 2027 (was 2 Aug 2026). Annex I product-embedded now 2 Aug 2028. Omnibus entered into force 27 Jul 2026. Council final approval 29 Jun 2026. Sandboxes deadline now 2 Aug 2027. Grace period for AI-generated-content marking cut to 3 months, new date 2 Dec 2026 (Council release). CONFLICT: one secondary source says 2 Feb 2027 for pre-existing systems. | Primary pages seen in search: [Council 29 Jun 2026](https://www.consilium.europa.eu/en/press/press-releases/2026/06/29/artificial-intelligence-council-gives-final-green-light-to-simplify-and-streamline-rules/), [Commission "AI Omnibus enters into force"](https://digital-strategy.ec.europa.eu/en/news/ai-omnibus-enters-force). Secondary: [Orrick](https://www.orrick.com/en/Insights/2026/07/EU-AI-Act-Update-Digital-Omnibus-Finalizes-8-Compliance-Changes) |
| EU AI Act, GPAI and Article 50 transparency | GPAI model providers; anyone deploying chatbots or deepfakes | **LIVE** since 2 Aug 2026 (GPAI fines and Art. 50), per one secondary source. Verify exact scope. | Secondary: [Usercentrics](https://usercentrics.com/knowledge-hub/eu-ai-act-high-risk-delay-article-50-transparency-consent/) |
| India DPDP Rules 2025 | Almost every business processing digital personal data of Indians. Consent Managers. Significant Data Fiduciaries (SDFs). | Rules notified 13 Nov 2025. **AHEAD:** Rule 4 (Consent Managers) 13 Nov 2026. Main duties (notice, consent, security, breach, rights) 13 May 2027. CONFLICT: one source says 14 May. **UNCONFIRMED:** MeitY floated cutting 18 to 12 months (13 Nov 2026). One June 2026 briefing says this is already revised for SDFs; others say it is only a proposal. | Secondary: [Legal500](https://www.legal500.com/intelligence/india/privacy/from-draft-to-reality-key-changes-in-indias-dpdp-rules-2025), [Chambers](https://chambers.com/articles/meity-plans-to-cut-short-dpdp-compliance-timeline-and-notify-cross-border-restrictions-for-sdfs), [PIB doc](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf) (seen in results, not opened) |
| EU CBAM (definitive period) | EU importers of steel, aluminium, cement, fertiliser, electricity, hydrogen. By extension, their non-EU suppliers (including Indian exporters), who must supply emissions data. | **LIVE** since 1 Jan 2026. Authorised-declarant status needed above 50 t/yr (mass-based threshold replaced the EUR 150 exemption). Certificate sales from 1 Feb 2027. First annual declaration plus surrender due **30 Sep 2027** (moved from 31 May). CONFLICT: sources differ on whether the 31 Mar 2026 authorisation buffer applied. | Secondary only: [Reed Smith](https://www.reedsmith.com/our-insights/blogs/viewpoints/102lr9t/what-you-need-to-know-as-cbam-simplification-comes-into-effect/), [Climease](https://climease.com/en/eu-cbam-2026-definitive-regime-importers-2/), [CPM](https://www.cpm-scm.com/supply-chain-review/article-1468.html). No primary page opened. |
| EU Deforestation Regulation (EUDR) | Operators and traders of cattle, cocoa, coffee, palm, rubber, soy, wood, and derivatives. Non-EU suppliers (India: coffee, rubber, wood, paper, leather-adjacent) must supply geolocation and due-diligence data. | **AHEAD, already delayed twice.** 30 Dec 2026 for large and medium operators. 30 Jun 2027 for micro and small. Commission review (COM(2026) 191, 4 May 2026) reportedly proposed no further postponement. Delegated act on product scope is draft. | Primary pages seen in search: [Commission report COM(2026)191](https://environment.ec.europa.eu/document/download/a3c5c3a0-232e-43c4-b0b8-1eecb1df45c7_en?filename=Report+from+the+Commission+to+the+Council+and+Parliament+on+the+EUDR.pdf), [Council Dec 2025](https://www.consilium.europa.eu/en/press/press-releases/2025/12/18/deforestation-council-signs-off-targeted-revision-to-simplify-and-postpone-the-regulation/). Secondary: [Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/02/eu-regulation-on-deforestation-free-products-eudr-what-lies-ahead-in-2026), [HLC](https://www.hlc.com/en/publications/eu-deforestation-regulation-commission-publishes-simplification-package-ahead-of-december-2026) |
| Poland KSeF e-invoicing | All VAT-registered Polish businesses | **LIVE.** Large taxpayers from Feb 2026. Everyone else from 1 Apr 2026. Micro (monthly sales up to PLN 10,000) issuing from 1 Jan 2027. Small firms may use paper or other formats until 30 Sep 2026 per one source; offline mode until 31 Dec 2026. **Penalties UNCONFIRMED:** older sources say from 1 Jan 2027. Newer sources (16 Sep 2026) say the Ministry of Finance announced a plan to extend the penalty-free period to 31 Dec 2027, possibly still a proposal. | Secondary: [vatcalc](https://www.vatcalc.com/poland/poland-mandatory-b2b-ksef-e-invoices-delay-to-july-2024/), [RTC Suite](https://rtcsuite.com/poland-announces-possible-extension-of-ksef-penalty-free-period-until-2028/), [terminovo](https://www.terminovo.pl/en/what-is-ksef/) |
| France e-invoicing and e-reporting | All VAT-registered businesses | **LIVE for receiving:** 1 Sep 2026, all companies. Issuing: large and mid-size (ETI) from 1 Sep 2026. **AHEAD:** SMEs and micro issue from **1 Sep 2027**. Size-band definitions differ by source. An old "1 Dec" postponement rumour was not confirmed. | Secondary: [ClearTax France](https://www.cleartax.com/fr/en/e-invoicing-france), [EY](https://www.ey.com/en_gl/technical/tax-alerts/france-revises-schedule-for-adopting-e-invoicing-reform), [Hayot SME guide](https://hayot-expertise.fr/en/guides/facturation-electronique-2026-2027-guide-pme) |
| Germany B2B e-invoicing | All German businesses | Receiving structured e-invoices **LIVE** since 1 Jan 2025. Issuing mandatory **1 Jan 2027** for prior-year turnover above EUR 800k. Everyone else **1 Jan 2028**. A trade body asked for a one-year delay in Jun 2026; no postponement confirmed. | Secondary: [ClearTax DE](https://www.cleartax.com/de/en/e-invoicing-germany), [e-invoicing.org](https://e-invoicing.org/germany/), [VATupdate](https://www.vatupdate.com/2026/03/24/germany-e-invoicing-b2b-mandate-timeline-and-compliance/) |
| Belgium B2B e-invoicing | All Belgian VAT-registered businesses | **LIVE** since 1 Jan 2026 (Peppol, EN 16931). Tolerance period ended 31 Mar 2026. E-reporting planned 1 Jan 2028 (draft law, one source, Jul 2026). | Secondary: [FONOA](https://www.fonoa.com/resources/blog/belgium-e-invoicing-grace-period-2026), [EDICOM](https://edicomgroup.com/blog/belgium-will-make-b2b-electronic-invoice-mandatory) |
| India GST e-invoicing | Businesses with aggregate turnover above INR 5 crore | **LIVE.** Threshold still INR 5 crore (since 1 Aug 2023) per consultant blogs. No confirmed cut seen. One blog mentions an unconfirmed INR 2 crore proposal. | Secondary only: [Gimbooks](https://www.gimbooks.com/blog/5-crore-e-invoice-turnover-rule-2026/), [Accountune](https://accountune.com/e-invoicing-compulsory-india-small-business-2026). No GST portal or CBIC page seen. |
| EU Cyber Resilience Act (CRA), reporting | Manufacturers of products with digital elements, including software and IoT, sold in the EU | **LIVE** since 11 Sep 2026: actively exploited vulnerabilities and severe incidents to be reported via the ENISA Single Reporting Platform (initial operating capability launched 11 Sep 2026). Open-source steward duties 11 Dec 2027 (per one source). Main product obligations: my recollection is Dec 2027; **not verified in this session**. | Primary pages seen in search: [Commission CRA reporting](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting), [ENISA SRP launch](https://www.enisa.europa.eu/news/the-cra-single-reporting-platform-is-launched). Secondary: [Crowell](https://www.crowell.com/en/insights/client-alerts/its-live-the-cyber-resilience-act-reporting-is-mandatory-as-of-today-11-september-2026) |
| EU NIS2 | Medium and large entities in 18 sectors, plus supply-chain pressure on smaller suppliers | **LIVE in most states.** Commission referred Ireland, Spain, France and the Netherlands to the CJEU on 8 Jul 2026. One tracker: 21 of 27 states with laws in force as of 2 Aug 2026. Digital Omnibus and a Jan 2026 targeted amendment would change reporting and scope. Adoption of those amendments is **UNCONFIRMED**. | Secondary: [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/european-commission-refers-four-member-states-to-cjeu-over-nis2-transposition-delays), [Kennedys](https://www.kennedyslaw.com/en/thought-leadership/article/2026/the-2025-european-commission-eu-digital-omnibus-package-the-nis2-directive/) |
| EU Pay Transparency Directive | Employers in the EU (reporting thresholds by headcount) | Transposition deadline **7 Jun 2026 passed.** Only about 4 to 5 states fully transposed (Slovakia, Italy, Lithuania, Malta per two sources). Others target 1 Jan 2027 or later. Sweden: sources conflict. No EU-level delay. | Secondary: [Morgan Lewis](https://www.morganlewis.com/pubs/2026/06/eu-pay-transparency-directive-the-deadline-for-transposition-has-passed-what-now), [Lewis Silkin](https://www.lewissilkin.com/insights/2026/07/01/eu-pay-transparency-directive-2026-employer-compliance), [Littler](https://www.littler.com/news-analysis/asap/did-member-states-meet-deadline-status-implementation-eu-pay-transparency) |
| EU Accessibility Act (EAA) | Consumer-facing e-commerce, banking, e-books, transport ticketing sold in the EU. Microenterprises (under 10 staff and under EUR 2m) exempt for services. | **LIVE** since 28 Jun 2025 (date from my background knowledge; the sources assume it). Enforcement thin: no confirmed EAA fines reported as of Jun 2026. Dutch ACM found 61% of ~100 largest shops inaccessible (Mar 2026). French Lille court dismissed the Auchan claim on 6 May 2026. | Secondary: [EqualWeb one year on](https://www.equalweb.com/blog/european-accessibility-act-one-year-on/), [Level Access](https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/) |
| EU CSRD / CSDDD (Omnibus I) | Very large EU companies; non-EU parents | **SCOPE CUT.** CSRD now only above 1,000 employees and above EUR 450m turnover. Omnibus in force 18 Mar 2026. Voluntary SME standard published in the OJ 21 Sep 2026 (CONFLICT: one source says 24 Sep). CSDDD applies from Jul 2029. Value-chain cap protects firms under 1,000 staff. | Secondary: [Latham](https://www.lw.com/en/insights/eu-sustainability-omnibus-published-in-the-official-journal), [Lexology](https://www.lexology.com/library/detail.aspx?g=1f627ab7-e226-4ad6-81fd-d934e700b34a), [CIF](https://cif.ie/2026/10/05/csrd-and-the-eu-voluntary-standard-clarity-for-companies-between-the-thresholds/) |
| EU PPWR (packaging) | Producers and sellers of packaged goods into EU countries | **LIVE** since 12 Aug 2026. Authorised-representative rule (Art. 45): one per Member State, no transition period per vendor guides. A Commission proposal to suspend it for EU-based producers until 2035 exists; adoption **UNCONFIRMED**. No general SME exemption. | Secondary: [eprrepresentative.com](https://eprrepresentative.com/ppwr-2026-compliance), [Coolset](https://www.coolset.com/academy/ppwr-authorised-representative). Both are vendors. |
| EU battery passport / ESPR DPP | Battery makers (EV, industrial above 2 kWh, LMT). Textiles later. | Battery passport **18 Feb 2027** (fixed by Battery Regulation). Textile delegated act not adopted; compliance estimated late 2028 or 2029. | Secondary vendor blogs: [PassportCraft](https://passportcraft.com/insights/dpp-timeline-2026-2030-every-deadline), [Narravero](https://www.narravero.com/en/blog/digital-product-passport-deadlines) |
| EU DORA | Financial entities and their ICT providers | **LIVE** since 17 Jan 2025 (from my background knowledge). 2026 Register of Information round is narrower (Austria window 16 Feb to 13 Mar 2026). First Critical ICT Third-Party Provider list published 18 Nov 2025, 19 providers. | Primary pages seen in search: [FSMA Belgium](https://www.fsma.be/en/news/dora-register-information-third-party-ict-service-providers-limited-update-2026), [FMA Austria](https://www.fma.gv.at/en/cross-sectoral-topics/dora/dora-managing-of-ict-third-party-risk/) |
| US state privacy laws | Businesses over state thresholds | Indiana, Kentucky and Rhode Island **LIVE** 1 Jan 2026. Louisiana and Oklahoma 1 Jan 2027. Alabama 1 May 2027. Vermont: CONFLICT (2027 vs 2028). Count of states: 19 or 20 depending on the source. | Secondary: [Venable](https://www.venable.com/insights/publications/2026/07/2026-mid-year-state-privacy-law-update), [Morgan Lewis](https://www.morganlewis.com/pubs/2026/07/new-us-state-consumer-privacy-laws-what-businesses-should-know), [MultiState](https://www.multistate.us/insider/2026/2/4/all-of-the-comprehensive-privacy-laws-that-take-effect-in-2026) |
| California CCPA regs (ADMT, risk assessments, cyber audits) | Businesses meeting CCPA thresholds | Risk assessments required since 1 Jan 2026; existing processing by 31 Dec 2027. ADMT duties **1 Jan 2027**. Submission of assessments to CPPA 1 Apr 2028. Cyber-audit certifications: 1 Apr 2028 (over $100m), 2029 ($50-100m), 2030 (under $50m). CONFLICT over which revenue year sets the tier. | Secondary: [Skadden](https://www.skadden.com/insights/publications/2026/06/californias-mandatory-risk-assessment-and-cybersecurity-audit-certification-requirements), [Baker McKenzie](https://connectontech.bakermckenzie.com/california-consumer-privacy-act-regulations-finalized-automated-decision-making-risk-assessments-and-cybersecurity-audits-how-businesses-can-prepare-for-the-new-requirements/), [Alston](https://www.alston.com/en/insights/publications/2026/08/california-ccpa-cybersecurity-risk-audits) |
| Colorado AI Act | Developers and deployers of high-risk AI | **MOVED, not repealed.** SB 189 (signed 14 May 2026) delays the date from 30 Jun 2026 to **1 Jan 2027** and narrows the rules. | Secondary: [Sigma Law](https://sigmalawgroup.com/blog/2026-07-23-colorado-ai-act/) |
| HIPAA Security Rule overhaul | Covered entities and business associates | **NOT FINAL.** NPRM published 6 Jan 2025. Unified Agenda moved it to long-term actions with a July 2027 target. Existing rule still enforced. | Secondary: [Clark Hill](https://www.clarkhill.com/news-events/news/hipaa-security-rule-update-delayed-until-2027/), [HIPAA Journal](https://www.hipaajournal.com/hipaa-security-rule-business-associates/) |
| CMMC Phase 2 (US defence contractors) | Defence suppliers handling CUI | **SUSPENDED.** Phase 2 was due 10 Nov 2026. Reported suspended 13 Jul 2026 by memo. Task force reviewing; officials did not rule out ending the program. Phase 1 self-assessments and DFARS 7012 still apply. DoD page in results was stale, so I could not confirm from a primary notice. | Secondary: [Wiley](https://www.wiley.law/alert-DOD-Pauses-CMMC-2-0-Implementation-A-Big-Deal-with-Little-Immediate-Impact), [Latham](https://www.lw.com/en/insights/what-defense-contractors-should-know-about-dod-suspension-of-cmmc-phase-2), [A-LIGN](https://www.a-lign.com/articles/cmmc-phase-ii-suspension) |

---

## 2. Ranked opportunities

Common caveat: the revenue figures below are my estimates, not found data. "Confidence" is confidence the market is real and winnable by a solo founder, not confidence in the revenue.

### 1. CBAM data kit for Indian MSME exporters (steel, aluminium, fertiliser, cement-adjacent) - highest India-specific edge
- **Problem:** The definitive period has been live since 1 Jan 2026. EU importers face a first declaration and surrender by 30 Sep 2027. They must get embedded-emissions data from non-EU suppliers, or fall back on default values that carry penalties. Sources: [Reed Smith](https://www.reedsmith.com/our-insights/blogs/viewpoints/102lr9t/what-you-need-to-know-as-cbam-simplification-comes-into-effect/), [Climease](https://climease.com/en/eu-cbam-2026-definitive-regime-importers-2/).
- **Evidence:** A cluster of vendors already sells CBAM tools ([CarbonChain](https://www.carbonchain.com/cbam), [Climease](https://climease.com/en/eu-cbam-2026-definitive-regime-importers-2/), [Cargolinked](https://cargolinked.com/guides/cbam-definitive-period-2026-importer-guide), [CO2-IQ](https://co2-iq.com/en/eu-cbam-regulation)). That shows spend exists. I did not find evidence of Indian MSME demand specifically. That part is **inference** (India exports steel and aluminium products to the EU; I did not verify volumes).
- **Who pays:** Indian exporters or their EU buyers. Guess: USD 50-300 per month per exporter, or USD 500-2,000 per year per buyer-supplier pack. Unproven.
- **Incumbents:** CarbonChain, Climease, Cargolinked and others above. Mostly aimed at EU importers or large producers.
- **MVP:** Per-installation emissions calculator (direct plus indirect, default vs actual), supplier data template in the CBAM communication format, and an exportable pack for EU buyers.
- **Competition:** Medium. Crowded for EU importers, thinner for cheap tools aimed at small Indian suppliers (**unverified**).
- **Path to $10K MRR:** About 100 exporters at USD 100 per month. Sell via CA firms, export promotion councils, and LinkedIn outreach to Indian suppliers of EU buyers.
- **Exit:** Acquisition by a carbon-accounting or trade-compliance vendor. Plausible at 3-5x ARR for USD 120K+ ARR. Speculative.
- **Confidence:** Medium. Risk: the Omnibus may narrow rules (not checked), and the 50-tonne exemption excludes the smallest importers.

### 2. DPDP compliance toolkit for Indian startups and SMBs
- **Problem:** Main duties start 13 May 2027 (Rule 4 for Consent Managers 13 Nov 2026). Startups think it means a consent banner; it also means notices, rights handling, breach reporting (72-hour style) and processor contracts. Sources: [Legal500](https://www.legal500.com/intelligence/india/privacy/from-draft-to-reality-key-changes-in-indias-dpdp-rules-2025), [Inc42](https://inc42.com/features/india-dpdpa-startups-privacy-compliance-costs-burden-law/).
- **Evidence:** EY India figure of over INR 10,000 crore compliance services market over three years is cited in a vendor-fed source ([Inc42/others](https://inc42.com/features/india-dpdpa-startups-privacy-compliance-costs-burden-law/)); unverified. Vendors quote INR 15 lakh to 2 crore for full compliance, while a small startup could be compliant for under INR 50,000 per year ([ecorpit](https://ecorpit.com/dpdp-compliance-cost-indian-startups-2027-deadline/), a vendor). That gap is the opening.
- **Who pays:** Indian startups, D2C brands, edtech and healthtech SMBs. INR 2,000-8,000 per month (~USD 25-95).
- **Incumbents:** IDfy, Concur, Consentin (Leegality), Blutic (Neokred), Complynz, Consee ([ITVoice](https://www.itvoice.in/top-7-dpdp-consent-managers-built-for-indias-privacy-first-enterprise-era)).
- **MVP:** Consent banner plus notice generator in multiple Indian languages, rights-request inbox with SLA timers, breach register and a vendor/processor tracker.
- **Competition:** High and growing. Differentiate on price and self-serve onboarding.
- **Path to $10K MRR:** About 150 customers at ~USD 65. Hard in a low-ARPU market. The deadline spike is H1 2027, so timing is tight.
- **Exit:** Weak to moderate (acquirers are IDfy-type vendors). Sale at USD 500K plausible only with sticky revenue.
- **Confidence:** Medium. Demand is real; DPB enforcement against tiny startups is expected to be slow (secondary opinion).

### 3. AI e-invoice converter and validator for EU SMBs and accountants (XRechnung, ZUGFeRD/Factur-X, Peppol, KSeF)
- **Problem:** Germany issuing starts 1 Jan 2027 (above EUR 800k) and 1 Jan 2028 for the rest. France SMEs issue from 1 Sep 2027. Belgium is live. Poland is live. Many small firms still produce PDFs and Excel. Sources: [Germany](https://www.cleartax.com/de/en/e-invoicing-germany), [France](https://www.cleartax.com/fr/en/e-invoicing-france), [Belgium](https://www.fonoa.com/resources/blog/belgium-e-invoicing-grace-period-2026).
- **Evidence:** Dates are consistent across many secondary sources; I found no primary BMF or DGFiP page. Demand for the SMB end specifically is **inferred**.
- **Who pays:** Small accountants, bookkeepers, and SMBs that do not use a compliant ERP. EUR 20-100 per month.
- **Incumbents:** Large e-invoicing vendors (Esker, Avalara, Basware, Tradeshift) and country invoice apps. Free open-source libraries exist (Mustang for ZUGFeRD; I recall this, not verified here).
- **MVP:** Upload PDF, Excel or an email, extract with an LLM, output validated XML plus a hybrid PDF with a validation report.
- **Competition:** High but fragmented; a free validator exists in many countries.
- **Path to $10K MRR:** About 200 accountants or SMBs at EUR 50. Needs EU-language SEO and partnerships.
- **Exit:** Moderate. Buyers: accounting and invoicing platforms.
- **Confidence:** Medium. Danger: the format gets commoditised by accounting software updates.

### 4. EUDR due-diligence statement helper for small importers and Indian suppliers
- **Problem:** 30 Dec 2026 (large and medium) and 30 Jun 2027 (micro and small). A due-diligence statement, geolocation data and traceability are required. Sources: [Commission report](https://environment.ec.europa.eu/document/download/a3c5c3a0-232e-43c4-b0b8-1eecb1df45c7_en?filename=Report+from+the+Commission+to+the+Council+and+Parliament+on+the+EUDR.pdf), [HLC](https://www.hlc.com/en/publications/eu-deforestation-regulation-commission-publishes-simplification-package-ahead-of-december-2026).
- **Evidence:** The regulation has slipped twice. The review reportedly confirms no postponement but I could not open the full text. The delegated act on scope is still a draft (products may be added or removed).
- **Who pays:** Small EU importers of coffee, cocoa, rubber, timber, paper, plus Indian suppliers. USD 100-400 per month.
- **Incumbents:** Coolset, Meridia, Satelligence and others (named in search results, not verified one by one).
- **MVP:** Plot-polygon uploader, deforestation check against open data, DDS PDF/XML generator for the EU information system.
- **Competition:** Medium to high. Geodata work is heavy for a solo founder.
- **Path to $10K MRR:** About 50 customers at USD 200. Depends on enforcement being real.
- **Exit:** Moderate if sold to a supply-chain platform.
- **Confidence:** Low to medium. A third postponement or enforcement softness would kill demand.

### 5. CRA readiness for small software and hardware makers (SBOM, vulnerability handling, technical file)
- **Problem:** Reporting duties have applied since 11 Sep 2026 and the ENISA platform is live. Manufacturers need a vulnerability-handling process, SBOM and a technical file before the main application date (my recollection: Dec 2027, unverified). Sources: [Commission](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting), [ENISA](https://www.enisa.europa.eu/news/the-cra-single-reporting-platform-is-launched).
- **Evidence:** Law-firm alerts only. I have no data on how many small makers are buying tools.
- **Who pays:** Small IoT, firmware and embedded vendors, SaaS shipping client software. USD 100-500 per month.
- **Incumbents:** SBOM and vulnerability tools (Snyk, Anchore, Cybeats and others; **named from memory, not verified**), plus consultancies.
- **MVP:** Repo scan to SBOM, CVE watch, a reporting-clock tracker (24-hour early warning per secondary sources) and a technical-file template.
- **Competition:** High on SBOM; low on "CRA workflow for a 10-person firm".
- **Path to $10K MRR:** About 40 customers at USD 250. Slow, long sales cycle.
- **Exit:** Moderate: acquisition by a DevSecOps vendor.
- **Confidence:** Low to medium.

### 6. KSeF connector for non-Polish tools and cross-border sellers
- **Problem:** Mandatory since 1 Apr 2026; micro firms from 1 Jan 2027. Foreign VAT-registered businesses without a fixed establishment are reportedly in scope. Penalties may be deferred to 2028 (unconfirmed). Sources: [terminovo](https://www.terminovo.pl/en/what-is-ksef/), [RTC Suite](https://rtcsuite.com/poland-announces-possible-extension-of-ksef-penalty-free-period-until-2028/).
- **Evidence:** Many Polish invoicing apps exist; the gap for foreign tools is inference.
- **Who pays:** Shopify and WooCommerce sellers, foreign SaaS billing into Poland, accountants. EUR 20-60 per month.
- **Incumbents:** Polish invoicing SaaS (names from memory: inFakt, wFirma, Fakturownia; **not verified**), plus large vendors.
- **MVP:** Stripe, Shopify and Xero webhook to KSeF FA(3) XML with token handling and status tracking.
- **Competition:** Medium. Language barrier for the founder; deferred penalties lower urgency.
- **Path to $10K MRR:** About 250 customers at EUR 35. Hard.
- **Exit:** Low to moderate.
- **Confidence:** Low.

### 7. EAA accessibility audit-and-fix for small EU-selling Shopify and WooCommerce stores
- **Problem:** The EAA applies to e-commerce; enforcement exists in the Netherlands, France and Sweden but fines are not confirmed. Dutch regulator: 61% of the largest shops failed. Sources: [EqualWeb](https://www.equalweb.com/blog/european-accessibility-act-one-year-on/), [Level Access](https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/).
- **Evidence:** Complaint counts are low (Sweden's PTS had 124 complaints per one source). Overlay products are widely criticised (my recollection; not verified here).
- **Who pays:** Small shops over the microenterprise cutoff. USD 29-149 per month.
- **Incumbents:** accessiBe, UserWay, EqualWeb, Level Access (**named from memory and search results**).
- **MVP:** Crawl, WCAG 2.1 AA / EN 301 549 issues, accessibility statement generator, AI-suggested theme-code fixes as pull requests.
- **Competition:** Very high.
- **Path to $10K MRR:** About 150 stores at USD 65.
- **Exit:** Low to moderate.
- **Confidence:** Low. Weak enforcement means weak urgency.

### 8. Pay-transparency toolkit for EU employers with 100-500 staff
- **Problem:** The 7 Jun 2026 deadline passed with only a few states transposed; no EU delay. Employers need job architecture, pay-range postings and gap reporting. Sources: [Morgan Lewis](https://www.morganlewis.com/pubs/2026/06/eu-pay-transparency-directive-the-deadline-for-transposition-has-passed-what-now), [Lewis Silkin](https://www.lewissilkin.com/insights/2026/07/01/eu-pay-transparency-directive-2026-employer-compliance).
- **Evidence:** Incumbent comp-benchmarking vendors (Ravio, Payscale, Syndio, Trusaic appear in results) show demand but also saturation.
- **Who pays:** HR leads. USD 200-500 per month.
- **MVP:** Pay-gap calculator by category of worker from payroll CSV, with a country-by-country rule matrix.
- **Competition:** High. Country laws are inconsistent, which creates maintenance burden.
- **Path to $10K MRR:** About 30 customers at USD 330.
- **Exit:** Moderate (HRIS acquirers).
- **Confidence:** Low.

### 9. PPWR packaging data and EPR tracker for small EU sellers
- **Problem:** Live since 12 Aug 2026. Authorised representative per Member State may be required. No SME exemption. Sources: [eprrepresentative.com](https://eprrepresentative.com/ppwr-2026-compliance), [Coolset](https://www.coolset.com/academy/ppwr-authorised-representative).
- **Evidence:** Crowded with vendors (Packgine, Assent, VERSO, Repax, Lappa per [OMR](https://omr.com/en/reviews/category/ppwr-compliance)). A published starting price of USD 1,200 per quarter leaves a gap below that.
- **MVP:** SKU-level packaging weight and material sheet with per-country EPR fee estimator and report export.
- **Confidence:** Low. Risk: the AR suspension proposal for EU producers, and country-specific EPR work that does not scale for a solo builder.

### 10. NIS2 supplier-questionnaire autopilot for SMEs
- **Problem:** NIS2 is live in most states; SMEs get security questionnaires from in-scope customers. This is supply-chain pressure, not a hard deadline.
- **Evidence:** Inference only. Adoption of the NIS2 simplification amendments is unconfirmed ([Kennedys](https://www.kennedyslaw.com/en/thought-leadership/article/2026/the-2025-european-commission-eu-digital-omnibus-package-the-nis2-directive/)).
- **Incumbents:** Vanta, Drata, SafeBase and questionnaire-automation tools (from memory).
- **Confidence:** Low. No hard deadline and crowded.

---

## 3. Rejected ideas and why

| Idea | Why rejected |
|---|---|
| CMMC readiness | Phase 2 reported suspended 13 Jul 2026, with the programme possibly ending. Deadline gone ([Wiley](https://www.wiley.law/alert-DOD-Pauses-CMMC-2-0-Implementation-A-Big-Deal-with-Little-Immediate-Impact)). |
| EU AI Act high-risk compliance for SMBs | Moved to 2 Dec 2027 / 2 Aug 2028. Crowded GRC space. Urgency has dropped ([Council](https://www.consilium.europa.eu/en/press/press-releases/2026/06/29/artificial-intelligence-council-gives-final-green-light-to-simplify-and-streamline-rules/)). |
| CSRD reporting tool | Scope cut to over 1,000 staff and over EUR 450m. Target customers are large and already served by enterprise vendors ([Latham](https://www.lw.com/en/insights/eu-sustainability-omnibus-published-in-the-official-journal)). The voluntary SME standard has no deadline. |
| HIPAA Security Rule update tooling | Rule not final; target July 2027 with a likely compliance date in 2028 ([Clark Hill](https://www.clarkhill.com/news-events/news/hipaa-security-rule-update-delayed-until-2027/)). |
| SOC 2 / ISO 27001 automation | Pricing gap is real (Vanta median ~USD 20K per year per one auditor-run page: [soc2auditors.org](https://soc2auditors.org/insights/vanta-alternatives/)) but the space has many funded players, including cheaper and open-source ones. Not regulation-deadline driven. |
| India GST e-invoicing | Threshold unchanged at INR 5 crore; mature incumbents (ClearTax etc., from memory). No new deadline seen. |
| Colorado AI Act tooling | Narrowed and delayed to 1 Jan 2027; one state; small buyer pool. |
| US privacy / cookie consent | Thresholds exclude most small firms; heavy incumbents (Termly, iubenda, Cookiebot are from memory, not verified). |
| California cyber-audit / risk-assessment tooling | First filings 2028-2030 and only for firms over thresholds. Too far out for fast MRR. |
| Battery or textile Digital Product Passport | Only batteries have a fixed date (18 Feb 2027), narrow niche. Textiles are 2028-2029 and dependent on an unadopted act. |
| DORA | Narrow regulated buyer set, enterprise sales cycles, 2026 register round smaller. |
| Belgium e-invoicing standalone | Already live and absorbed by existing Peppol access points. Folded into opportunity 3 instead. |

---

## 4. What I could not verify

- Primary text of any regulation. WebFetch and curl were blocked, so no EUR-Lex or Official Journal check was possible. Dates rest on search summaries of institution pages plus law-firm commentary.
- Search budget ran out before I covered: ADA Title II web rule (my unverified recollection: 24 Apr 2026 for governments with 50k+ people and 26 Apr 2027 for smaller ones; a delay is possible and I did not check), COPPA amendments, US app-store age-verification laws, California SB 253/261, UAE/Saudi/Malaysia e-invoicing, EU Data Act, TAKE IT DOWN Act, UK regulations.
- Whether MeitY formally shortened DPDP timelines (sources conflict). Whether the Poland penalty deferral to 2028 was enacted. Whether the PPWR AR suspension for EU producers was adopted. Whether the NIS2 amendment was adopted.
- AI Act Art. 50(2) grace date: Council release says 2 Dec 2026; one secondary source says 2 Feb 2027.
- Whether CBAM or EUDR face further amendment after the dates I saw. The CBAM 50-tonne rule and the 2027 quarterly 50% purchase rule are from secondary sources only.
- Real demand and willingness to pay for every opportunity above. No Reddit threads, forum complaints or customer interviews surfaced; the SOC 2 Reddit-style query returned only vendor comparison pages. All prices and MRR paths are my estimates.
- Competitor lists marked "from memory" were not checked this session.
- Several search results carried dates up to 5 Oct 2026; I assume they are real, but could not cross-check them.

---

## Summary view

Ranked by combined deadline realness, India edge, and solo-founder feasibility: (1) CBAM data kit for Indian exporters, (2) DPDP SMB toolkit, (3) AI EU e-invoice converter, (4) EUDR helper, (5) CRA readiness. The rest are weak or crowded. Strongest real deadlines still ahead: DPDP 13 May 2027, Germany e-invoicing 1 Jan 2027 and 2028, France SME issuing 1 Sep 2027, CBAM declaration 30 Sep 2027, EUDR 30 Dec 2026 and 30 Jun 2027, California ADMT 1 Jan 2027.
