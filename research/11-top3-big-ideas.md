# 10,000-idea sweep and top 3 "venture-size" picks

## Method (and its limits)
- Matrix of 105 customer segments x 99 painful workflows = 10,395 combinations (`ideas-10000.csv`), each scored on budget x pain, reachability x adoption, low crowding and AI-fit. Scores are my own 1-5 judgments, not measured data.
- Most combinations are incoherent (e.g. "sales teams x prior authorization"), so the raw ranking is a filter, not a pick list.
- What it surfaced: workflows that are high pain, high AI-fit and low crowding cluster in regulated paperwork and appeals: tax notices, prior authorization / medical billing denials, permits and licensing, chargeback/claims disputes, RFP/tender response, document chasing, due diligence, patent/prior-art search, agent security.
- The three picks below are by judgment, using that cluster plus the 10 research reports. Nothing is validated. $10-100M is a ceiling if it works, not a forecast.

## Pick 1: AI back-office for small accounting firms (intake, document chasing, notice response)
- Problem: accountants are short-staffed; clients send documents late, tax notices need drafted replies. Firms pay real money per seat.
- Why it can be big: ~100K+ small firms across US/UK/India/Brazil; $2-6K/yr per firm -> $10M ARR from ~2-4K firms; expansion into notices, reconciliation and payroll checks.
- Risk: incumbents (Karbon, TaxDome, Canopy) add AI; sales to conservative buyers is slow.
- Product Hunt fit: medium. PH gets early adopters and credibility, not accountants; use it for a waitlist and a free "tax notice reply" tool.

## Pick 2: Vendor-neutral permissions, secrets and budget control plane for AI agents
- Problem: coding agents and MCP tools run with broad credentials; GitHub issues (178+ thumbs-up on secrets, sandbox reading ~/.ssh) show loud pain; teams want per-agent budgets and audit.
- Why it can be big: "Okta/Vault for agents" is a plausible $100M outcome if agents become standard in every company; security budgets are large.
- Risk: highest. Anthropic/OpenAI/Cloudflare/identity vendors may absorb it; willingness to pay unproven.
- Product Hunt fit: best of the three. Developers upvote open-source, free-tier tools; a free local CLI/proxy that blocks secret leaks is a natural launch.

## Pick 3: Appeals autopilot for denied claims and notices (start with medical billing denials for small practices)
- Problem: denied claims and prior-auth rejections cost practices large revenue; appeals are tedious, rule-heavy and under-worked.
- Why it can be big: outcome-based pricing (e.g. 10-20% of recovered revenue) scales with money recovered; same engine extends to chargeback disputes, tax notices, permits.
- Risk: healthcare compliance (HIPAA, BAAs), long sales cycles, accuracy liability, large RCM players.
- Product Hunt fit: poor. Launch a free consumer "appeal my denied claim" letter tool for PH visibility and top-of-funnel; real revenue comes from direct sales to practices.

## Ranking by "10-100M" odds vs. solo-founder feasibility
1. Pick 1: best balance. 2. Pick 2: highest ceiling and best PH fit, but most absorption risk. 3. Pick 3: biggest dollars, hardest to enter solo.

## Product Hunt reality
A PH launch is a one-day traffic spike (typically hundreds of visits, a few dozen signups). It does not create a $10-100M business. Treat it as a free credibility and early-feedback event after you already have a working product, a waitlist and users.

## Unverified
Market sizes and prices above are rough estimates, not sourced. Do 10 customer interviews and a pre-sell for each pick before building.
