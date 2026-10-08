# Locked plan: Receipts + Appeals Autopilot

Status: both ideas are unvalidated hypotheses. Each has a go/no-go gate; if a gate fails, stop or pivot instead of building more.

## Product 1: Receipts (prediction scoreboard)
**Promise:** every public, dated, falsifiable prediction by a creator/pundit is extracted, resolved against data, and scored. Output = shareable "receipt" cards/clips.

### Built so far (in this repo)
- `receipts/` Python package (stdlib only), 9 passing tests (`python3 -m unittest discover -s tests_receipts -t .`)
  - strict rule-based extractor (numeric price-style claims only; vague talk is never scored)
  - plug-in point for an LLM extractor (`extract_with`), validated the same way
  - deterministic resolver against a price series
  - scorer: hit rate with a Wilson 95% lower bound, Brier score when confidence was stated, and a minimum of 10 resolved claims before anyone is ranked
- Not built: transcript fetching, price data feeds, web page, share cards.

### Next 14 days
1. Days 1-3: pick 20 finance/crypto creators. Get transcripts ONLY from sources whose terms allow it (check YouTube terms; fall back to manually licensed/auto captions the creator publishes). Do not scrape in breach of terms.
2. Days 3-6: run extractor, hand-verify every extracted claim (precision check). Target >= 90% of extracted claims correctly read by a human.
3. Days 6-9: pull public price data for resolution (document the source per claim).
4. Days 9-12: publish a static scoreboard page + 10 share cards. Every card links to the video timestamp and the data source.
5. Days 12-14: post to a few communities, measure.

### Go / no-go gate (day 14)
- GO if: precision >= 90% on 100 hand-checked claims AND at least one post gets >= 5,000 views or >= 100 shares/replies AND >= 50 email signups.
- Otherwise: pivot to B2B ("verify this creator's track record" reports for brands) or stop.

### Guardrails (non-negotiable)
- Score only clear, public, timestamped statements; always show the quote, link and date; never paraphrase into something stronger.
- Show the sample size; do not rank anyone below 10 resolved claims.
- Allow creators to dispute a claim; fix errors quickly and publicly.
- No claims about intent, honesty or character; only "said X, outcome was Y".

## Product 2: Appeals Autopilot
**Promise:** turn a denied claim / bill / notice into a well-formed appeal, and track it to resolution. Start with ONE narrow case to avoid legal risk and scope creep.

### Choose the first wedge (decide in week 1 by interviews)
Candidates: (a) health-insurance claim denials (US), (b) tax-notice replies (India), (c) flight-compensation claims. Pick the one where 10 people confirm they have a real recent case and would pay.

### Next 14 days
1. Days 1-4: 10 interviews with people who had a denied claim/notice in the last year. Ask what happened and what it cost them.
2. Days 4-8: build a letter generator for ONE denial type from a photo/PDF of the denial letter (cite the specific denial reason; never invent facts or policy clauses).
3. Days 8-12: 5-10 real users run their own case through it; track outcomes.
4. Days 12-14: decide pricing: free letter, paid tracking, or success fee.

### Go / no-go gate (day 14)
- GO if: >= 5 users submit real cases AND >= 3 would pay (or pay) AND no case reveals the tool giving wrong facts.
- Otherwise: pivot to another denial type or stop.

### Guardrails
- Never claim to be a lawyer or equal to one; position as drafting help for the user's own appeal (the FTC acted against an "AI lawyer" claim; verify the details before relying on it).
- Health data: do not store documents longer than needed; plan HIPAA/consent before handling any provider-side data.
- No success-fee pricing until accuracy and consent flows are proven.

## Shared rules
- Keep a decision log in this folder. Re-run competitor searches before each build step; markets move fast.
- Product Hunt only after a working product, a waitlist and some real results exist.
