# 06 - Consumer Problems: Enshittified Apps and Human-Service Tasks Ripe for AI

Researcher: agent 6 of 10. Date: 2026-10-08.
Buyer profile: solo founder, India-based, technical, AI-heavy. Goal: about $10K MRR fast, then sell for $500K-1M.

## READ THIS FIRST: limits of this research (honest disclosure)

- Only about 16 WebSearch queries completed. The shared search budget (200 per turn across all 10 agents) ran out mid-research, so the 40+ lookups asked for were NOT done.
- WebFetch failed on every domain tried (reddit.com and old.reddit.com blocked; trustmrr.com, hn.algolia.com, ftc.gov, pbs.org and producthunt.com returned DNS errors). I could not read any primary page, Reddit thread, App Store review page or HN thread directly.
- So every fact below comes from search-result summaries. Where a figure traces to a vendor, a competitor or a content-farm page, I say so.
- Direct user quotes are few. Only text that appeared in search results is quoted, each with its URL. I did not find real Reddit "I would pay" threads and I do not claim any.
- Labels used: [VERIFIED-SECONDARY] means reported by a credible outlet or law firm via search. [VENDOR] means from the company or a competitor's own marketing. [INFERENCE] is my reasoning, not evidence. [UNVERIFIED] means seen once on a weak source.
- Overall, treat the ranking as a hypothesis list that needs 1-2 days of validation (Reddit, App Store reviews, keyword volume), not a decision.

## Cross-cutting evidence (applies to many ideas)

1. Subscription fatigue is real and measurable.
   - NerdWallet survey: 55% of Americans plan to significantly cut back on subscriptions in 2026. https://www.hawaiinewsnow.com/2026/04/07/more-than-half-americans-plan-cut-subscriptions-2026-survey-finds/ [VERIFIED-SECONDARY]
   - Self Financial survey of 1,272 Americans: 70% had forgotten to cancel a free trial at some point, and 2.6 paid subscriptions go unused per month on average. https://www.mactech.com/2026/06/03/survey-only-19-6-of-those-subscribe-to-apple-tv-dont-use-it/ [VERIFIED-SECONDARY, one survey]
   - Older benchmark: 42% forgot they were still being charged. https://www.cnbc.com/2022/09/06/consumers-underestimate-monthly-subscription-costs-by-at-least-100.html
2. Regulation is a patchwork, which is a tailwind for "cancel it for me" tools.
   - The FTC "click to cancel" rule was vacated by the Eighth Circuit on July 8, 2025. https://www.wiggin.com/publication/ftcs-click-to-cancel-rule-has-been-vacated/
   - The FTC restarted rulemaking with an ANPRM on March 11, 2026. https://www.cov.com/en/news-and-insights/insights/2026/03/ftc-launches-new-rulemaking-on-the-negative-option-rule
   - NYC's cancellation rule takes effect Oct 1, 2026. https://www.shb.com/intelligence/newsletters/pds/pedersen-straus-hansen-aug-2026-click-to-cancel
   - Louisiana's Click-to-Cancel Act compliance date is Jan 1, 2027. https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/summer-2026-autorenewal-roundup-nyc-and-louisiana-enact-new-regulatory-requirements
3. Cautionary tale for "AI replaces a professional" products: the FTC finalized an order against DoNotPay on Jan 16, 2025 (5-0 vote). It requires $193,000 and bars "equals a human lawyer" claims without evidence. https://www.ftc.gov/node/87474 (summary: https://getcoai.com/news/ftc-bans-donotpays-ai-lawyer-claims-and-orders-refunds). Any legal, tax or medical product must be positioned as "organizes and drafts, you decide", never "replaces your lawyer".
4. Proof that a consumer AI wrapper can reach a large exit: Cal AI, built by two teenagers, reportedly did more than $40M in sales in 12 months and was acquired by MyFitnessPal. The $40M is company-reported. https://finder.techleap.nl/news/note/myfitnesspal-acquires-teen-built-cal-ai-after-40m-in-annual-sales and https://www.founded.com/this-teenager-built-a-30m-a-year-calorie-app-in-high-school-then-sold-it-to-myfitnesspal-two-years-later/ . That scale was driven by influencer marketing (https://www.ypulse.com/newsfeed/2025/03/20/two-high-schoolers-founded-cal-ai-a-calorie-tracking-app-with-millions-of-downloads-and-2m-in-revenue/), which is a cost and skill a solo technical founder may lack.

---

## 1. Ranked opportunities

Ranking logic: willingness to pay shown, recurring (not one-off) usage, weak incumbents, and feasibility for a solo India-based founder. Confidence is low to medium everywhere because of the research limits above.

### #1. Privacy-first "subscription and free-trial guardian" (no bank link; inbox or receipt based) with assisted cancellation

- Problem: people forget trials and get trapped in renewals. Incumbent Rocket Money earns complaints on cancellation, renewals and a success fee that survives cancelling.
- Evidence:
  - Trustpilot shows Rocket Money at about 3.2/5 across about 4,000 reviews. https://au.trustpilot.com/review/rocketmoney.com?page=8 (count in title "Reviews 4,126") [VERIFIED-SECONDARY via search summary]
  - Quoted complaint: reviewer "charged for 4+ years without my knowledge, even though I never used their product since 2018" (same Trustpilot source).
  - Bill-negotiation fee reported at 35-60% of savings, and the fee persists after cancelling Premium. https://www.howthemarketworks.com/?p=19307 (affiliate-style site, so [UNVERIFIED] on exact range).
  - Demand data: see the survey numbers and regulation timeline in the cross-cutting section.
- Who pays and how much: consumers, about $2-5/month or $20-40/year. Price anchors: Monarch $99.99/yr, Copilot about $95/yr (https://tech.yahoo.com/article/the-best-budgeting-apps-to-replace-mint-143047346.html). A cheap single-purpose tool undercuts these.
- Incumbents and weakness: Rocket Money (cancellation friction, fee on savings, bank-link trust), Mint (shut down; users displaced, per https://lopery.substack.com/p/mint-is-shutting-down-what-now), Monarch and Copilot (full budgeting, pricey, Copilot is Apple-only per the Yahoo source).
- MVP (1 line): a Gmail/Outlook receipt parser that lists every recurring charge and trial end date, sends "cancel by" alerts, and auto-generates a cancellation message plus the exact steps or link per merchant.
- Competition: high overall (Rocket Money, Bobby-style trackers, banks), but the no-bank-link, trial-reminder niche is [INFERENCE] under-served. I did not verify that.
- Path to $10K MRR: about 2,500-3,500 subscribers at $3-4/month. Acquisition would come from SEO ("how to cancel X" pages, which have steady search demand [INFERENCE]) plus regulation news hooks.
- Exit potential: moderate. Fintech and personal-finance acquirers exist, but the multiple depends on retention. Churn of a tracker app is a known risk because once cancelled, users leave [INFERENCE].
- Confidence: medium-low. Demand for pain is verified; willingness to pay recurring for a single-purpose tool is NOT verified.

### #2. AI photo/voice calorie and nutrition tracker for an underserved cuisine or diet niche (for example Indian food, diabetic or GLP-1 users)

- Problem: mainstream calorie trackers are paywalled and tedious, and general AI trackers are inaccurate on regional foods.
- Evidence:
  - Cal AI founder on MyFitnessPal: "I was tracking calories on MyFitnessPal... After three days, I quit. I was finding so much trouble using their app, typing in everything - it was very tedious, very burdensome to do." https://techcrunch.com/2025/04/03/teen-with-4-0-gpa-who-built-the-viral-cal-ai-app-was-rejected-by-15-top-universities (quote surfaced via search summary).
  - Paywall and subscription upsell was the dominant complaint category (29%) across calorie apps, per a scorecard from a competitor (MyNetDiary). https://www.mynetdiary.com/diet-app-scorecard-june-2026.html [VENDOR bias]
  - MyFitnessPal's 2022 barcode paywall is called "the loudest single complaint in the whole category" and its March 2026 redesign drew a rating drop (same MyNetDiary scorecards: https://www.mynetdiary.com/diet-app-scorecard-march-2026.html). [VENDOR]
  - Cal AI's own users complain about post-cancellation charges and denied refunds (same scorecard, June 2026) and accuracy.
  - Cal AI pricing: $2.49/week or $29.99/year (https://finder.techleap.nl/news/note/myfitnesspal-acquires-teen-built-cal-ai-after-40m-in-annual-sales). 
- Who pays: health-conscious consumers, $30-60/year in the US; much lower in India [INFERENCE: price must be region-tiered].
- Incumbents and weakness: MyFitnessPal (paywall, redesign backlash), Cal AI (accuracy, billing complaints), plus many clones. Regional accuracy (for example Indian dishes) is an [INFERENCE] gap that I did NOT verify with any search.
- MVP: photo-log meals with a model fine-tuned or prompted on a curated regional food database, with honest ranges and a one-tap correction.
- Competition: very high. A TrustMRR long tail in adjacent AI-photo categories shows most clones earn little (headshot examples: PhotoGuruAI $1,382 all-time, SelfieToPro $0 MRR, https://trustmrr.com/startup/photoguruai ). Cal AI's win came from influencer distribution.
- Path to $10K MRR: about 1,000-1,500 paying users at $7-10/month equivalent. Needs a creator-seeding channel.
- Exit potential: the strongest proven category exit in this report (Cal AI to MyFitnessPal), but one data point, and the winner was the first mover at scale.
- Confidence: medium on market, low on a solo-founder niche win.

### #3. Assistant for denied-claim and medical-bill appeals, sold as a household "health paperwork" subscription

- Problem: huge appeal gap. About 73 million claims for in-network services were denied in 2023 and under 1% were appealed (PBS summary). https://www.pbs.org/newshour/show/how-patients-are-using-ai-to-fight-back-against-denied-insurance-claims [VERIFIED-SECONDARY]
- Evidence of tools and prices:
  - Fight Health Insurance: free, with $5 optional fax. https://taylorcoffman.substack.com/p/fight-ai-with-ai
  - ApproveIt: 15% only when you win; AI-generated, not attorney-reviewed. https://www.producthunt.com/p/approveit/approveit-1f8efeb7-05ed-4868-a72a-0f8cfd9bcb53 [VENDOR]
  - Counterforce Health: nonprofit, free (maybe $20 app). https://www.crunchbase.com/organization/counterforce-health ($20 figure [UNVERIFIED], single directory).
  - Goodbill: contingency percentage of savings. https://www.geekwire.com/2022/the-darkest-most-bottomless-pit-in-healthcare-goodbill-raises-3-4m-to-tackle-medical-billing/
  - A PBS interviewee said services typically cost "like a $40 or $50 fee".
- Who pays: US patients, $40-50 one-off or 15% contingency. Recurring revenue is the problem: appeals are episodic [INFERENCE].
- Incumbents and weakness: free nonprofit tools cap price; contingency players have liability and operations burden. Free tools exist, which weakens a pure paid drafting product.
- MVP: upload denial letter and EOB, get a cited appeal letter, a deadline tracker and a follow-up calendar, plus year-round EOB monitoring for errors (the recurring hook).
- Competition: medium and rising (free nonprofit plus multiple startups).
- Path to $10K MRR: about 200 users at $49/year plus one-off $39 letters is far from $10K. Reaching $10K likely needs a B2B channel (patient advocates, employers) [INFERENCE].
- Exit: attractive to health-fintech and benefits platforms, but needs compliance work.
- Confidence: low-medium. Pain is verified; consumer recurring pay is not.

### #4. India-first "income tax notice and ITR mismatch" self-serve helper

- Problem: routine notices (143(1) intimations, 139(9) defective return) are sold as services starting at about Rs 4,999. https://www.incorpx.io/income-tax-notice-in-tirupati [VENDOR]
- Evidence: vendor pages say many notices are routine mismatches. https://www.incorpx.io/income-tax-notice-in-jalandhar [VENDOR]. Also bundled with ITR, TDS and GST help at https://www.startupgrantsindia.com/services/income-tax-notice-reply/fees .
- Who pays: Indian salaried and freelancers, Rs 299-999 per notice or Rs 999-1,999/year [INFERENCE on price]. Seasonal.
- Incumbents: local CA firms, filing portals. I did not verify the AI-native competitors.
- MVP: upload notice PDF, get plain-language meaning, likely cause, draft reply, portal steps.
- Competition: low to medium [INFERENCE, not searched].
- Path to $10K MRR: hard on pure ARPU in India (about 1,000+ annual subscribers at Rs 999). Better as a US/India NRI or expat tax variant.
- Exit: small. Likely sold to a tax-tech platform.
- Confidence: low. No independent demand data found ("no market-size figures" in the search).

### #5. AI flight-delay compensation with flat annual fee (not 35%)

- Evidence: AirHelp charges 35% (+15% legal) per its fee page, and its subscription AirHelp+ costs $42.99/yr (3 trips) or $99.99/yr (9 trips). https://www.airhelp.com/en-int/our-fees . Rivals charge 20-31% (AirAdvisor 30%+20%, EUclaim 31% + 33 EUR/person, Flightright 20-30%). https://airadvisor.com/en/compare/airhelp-vs-airadvisor [VENDOR comparisons]
- Who pays: travelers claiming EU/UK delay compensation; value per claim 250-600 EUR, so a 25-35% fee is 60-200 EUR.
- Weakness: high take rate on a mostly automatable claim. Not verified: how many of these claims are actually automatable or how fast airlines pay.
- MVP: trip email scanner that detects eligible delays and files the claim letters, charging a flat $9-15 per success or a yearly pass.
- Recurring: weak; travelers claim a few times a year. Retention only via a yearly pass.
- Competition: high, entrenched (AirHelp and others have legal and airline relationships).
- Confidence: low. Probably a feature, not a company.

### #6. Replacement for enshittified "tracker and notes" apps (local-first, one-time or low yearly price)

- Evidence: Evernote retired plans and cut the free tier to 50 notes in a Nov 2025 overhaul, with Starter at $99/yr, per an alternatives vendor blog [VENDOR, secondary]. https://www.atlasworkspace.ai/blog/alternatives-to-evernote . An Evernote user-exodus claim (-43% downloads in 2023) is [UNVERIFIED]. Free alternatives (Obsidian, Joplin, OneNote) already exist at no cost, which limits willingness to pay.
- Life360: raised monthly prices in Oct 2022 and expected more churn. https://investors.life360.com/node/6496/html . Teens dislike the tracking (TechCrunch 2020: https://techcrunch.com/2020/10/12/family-tracking-app-life360-launches-bubbles-a-location-sharing-feature-inspired-by-teens-on-tiktok ).
- Weakness of this idea: strong free substitutes; switching costs; I found no evidence that people pay for replacements. Listed low for that reason.
- Confidence: low.

### #7. AI resume tailoring plus job-application tracker

- Evidence: Jobscan $49.95/mo, Rezi $29/mo or $149 lifetime, Teal+ $9/wk or $29/mo (prices differ across sources). https://dupple.com/learn/best-ai-resume-builders . Rezi reportedly has about 11,287 active subscriptions via a TrustMRR listing, but the revenue widget did not load and the figure is [UNVERIFIED]. https://trustmrr.com/startup/rezi?metric=mrr . A Teal user complained of being charged after cancelling (one Trustpilot review, https://nl-be.trustpilot.com/review/tealhq.com?page=3 ).
- Willingness to pay is proven (monthly prices of $29-50), but usage is episodic: people leave when they land a job [INFERENCE], and the category is saturated with many tools.
- Competition: very high. Confidence: low-medium that a new entrant breaks through. A niche (for example non-US visa-sponsorship job seekers) might work but is untested here.

### #8. Plain-language lab-report / medical document explainer

- Evidence: many apps exist. Blood Buddy Pro about $49.99/yr (https://apps.apple.com/us/app/-/id6736627153); Death Clock premium $69/yr (https://runtimewire.com/article/death-clock-launch-free-blood-test-ai). A TrustMRR page shows Health3 at $52k MRR with 43 active subscriptions, which looks internally inconsistent and mixed with other products ([UNVERIFIED], https://trustmrr.com/startup/health3).
- Risk: medical liability and a very crowded App Store category. Confidence: low.

### #9. DIY immigration/visa paperwork copilot

- Evidence: Boundless priced about $500 (2018) and $750 (2019) for guided green-card filing with lawyer review. https://www.av.vc/blog/boundless-improving-the-immigration-process . A $75.3M revenue figure from a directory is a third-party estimate, [UNVERIFIED]. https://www.cbinsights.com/company/boundless-imigration
- High willingness to pay per case, but one-off, with unauthorized-practice-of-law exposure (see DoNotPay FTC order). Non-US variants (student visas for India-to-abroad applicants) are an [INFERENCE] I did not research.
- Confidence: low.

---

## 2. Rejected ideas and why

- Homework/answer-engine apps (Chegg-like): ChatGPT destroyed Chegg. Chegg lost more than half a million subscribers paying up to $19.95/month and its stock is down about 99% from early 2021 (WSJ via https://tech.slashdot.org/story/24/11/11/1525223 ). Needham survey: 62% of students planned to use ChatGPT versus 30% Chegg. Commoditized by free general AI. Gauth/Brainly revenue figures were from weak estimators.
- "AI lawyer / robot lawyer" positioning: FTC order against DoNotPay (see above). Trustpilot complaints include "Completely FRAUDULENT!" and "Very, VERY shady business practices" (https://www.trustpilot.com/review/donotpay.com?page=6 ). Reject the positioning, not the underlying task.
- Security-deposit demand-letter generators: tools exist (Depositron, DemandLetter AI), purely one-off, and a law-firm blog warns AI letters can backfire with invented penalties. https://terms.law/2025/02/24/why-ai-generated-security-deposit-demand-letters-can-backfire/ . Low retention, low price.
- AI headshot generators as a solo launch: Photo AI by Pieter Levels reportedly $132-138K MRR but that is a case-study estimate, and the long tail on TrustMRR is poor (Looktara about $22K in 150 days, Novaheadshot $11K all-time, PhotoGuruAI $1,382, SelfieToPro $0 MRR). One-off purchases, ad-driven, winner-takes-most. https://www.indiehackers.com/post/photo-ai-by-pieter-levels-complete-dive-case-study-0-to-132k-mrr-in-18-months-3a9a2b1579
- Language-learning challenger to Duolingo: the AI-first and Energy backlash is real, but Duolingo still reportedly has more than 50M daily users. https://ghfalcon.com/21674/showcase/how-duolingo-is-doing-after-its-ai-first-backlash-and-what-it-tells-us/ [weak source]. Content production and brand moat too heavy for a solo founder.
- Full personal-finance/budgeting app (post-Mint): crowded with funded, fairly priced incumbents (Monarch, Copilot, YNAB, Simplifi, PocketGuard). Better to attack one slice (see #1).
- Adobe/PDF angle: the FTC/DOJ suit over hidden early-termination fees is real (https://news.bloomberglaw.com/litigation/adobe-fails-to-escape-ftc-suit-over-subscription-cancellations) but I found no evidence on alternatives' willingness to pay, and PDF tools are heavily commoditized. Unresearched beyond that.

## 3. What I could not verify

- Any direct Reddit, HN, X or App Store review quotes showing "I'd pay for this" demand. WebFetch was blocked or DNS-failed, and the search budget ran out.
- Real revenue of Rezi, Jobscan, Teal, HeadshotPro, Aragon, Rocket Money, Goodbill, AirHelp or Boundless (the figures quoted are estimates, listings with unloaded widgets, or marketing).
- The Health3 $52k MRR with 43 subs claim (looks inconsistent).
- Whether Indian-cuisine calorie tracking, India tax-notice help, or non-bank-link subscription tracking are actually under-served. These are my inferences. I did not search for HealthifyMe, ClearTax, or Bobby-type competitors.
- Retention and churn benchmarks for AI consumer apps (RevenueCat's report was queued but the search was refused).
- Acquisition multiples for consumer subscription apps at the $500K-1M range (Acquire.com query refused). The Cal AI exit is the only exit datapoint, terms undisclosed.
- Current status of the FTC v. Intuit (TurboTax "free") case and of the Adobe case. TurboTax complaints (36 of 306 negative app reviews cite charges the user did not choose, https://unstar.app/blog/turbotax-free-edition-upgrade-charges-app-reviews-2026 ) come from one publisher and are not a representative poll.
- Whether App Store / Play policies and Apple's 15-30% cut change the economics for the web-vs-app choice.

## Suggested next step (to convert hypotheses into evidence)

With working Reddit and App Store access, spend one day on: (a) r/personalfinance, r/Frugal, r/legaladvice and r/HealthInsurance threads on cancelled subscriptions and denial appeals; (b) 1-star App Store reviews for Rocket Money, MyFitnessPal and Cal AI; (c) keyword volume for "how to cancel X", "calorie counter Indian food", "income tax notice reply". Then pick one of #1, #2 or #3 and run a paid-landing-page test before building.
