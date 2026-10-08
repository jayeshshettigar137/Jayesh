# Receipts: what they predicted, what happened

Static scoreboard of public, dated, falsifiable predictions. No backend, no database, no API keys: CSV in, website out. Python 3.9+ stdlib (Pillow + Chromium only if you want PNG share cards).

## Run it
```bash
python3 -m unittest discover -s tests_receipts -t .      # 15 tests
python3 -m receipts build --data data/sample --out site   # FICTIONAL demo (watermarked, bannered)
python3 -m receipts build --data data/receipts --out site --png   # your real data (+ PNG social cards)
python3 -m http.server -d site 8000                       # preview
```

## Add real data (this is what makes it launchable)
1. `data/receipts/claims.csv`: one row per claim. Columns: `id, speaker, source_url, said_on, quote, subject, asset, direction, target, deadline, confidence, verified, sample`.
   - `verified` must be `yes`, and you must have checked the exact quote at the source. Rows without it are never published.
   - `quote` is word for word. `direction` is `above` or `below`. `source_url` must be http(s); `id` letters/digits/-/_ only.
2. `data/receipts/prices/<ASSET>.csv`: `date,close` daily prices, filename = asset (e.g. `BTC.csv`). Use a source you can cite; mention it on the methodology page.
3. Rebuild. A claim with no price file shows as UNSCORABLE, never as wrong.
4. Nobody is ranked until they have 10 resolved claims.

## Ship it (about 15 minutes)
1. Edit `site.json`: your name, `url` (final site URL) and `repo` (`owner/name`) so the submit/dispute buttons work.
2. Push to `main`. In the repo: Settings -> Pages -> Source = GitHub Actions. The included workflow runs tests, builds and deploys.
3. Check: the home page, one receipt page, the share card, and the submit/dispute links on your phone.

## Launch checklist
- [ ] At least 30 hand-verified real claims, from at least 3 speakers, at least 10 resolved for one of them (otherwise the leaderboard is empty)
- [ ] Every quote re-read against its source; links open
- [ ] Price data sources noted and spot-checked
- [ ] Sample data NOT in `data/receipts`
- [ ] Dispute process live (GitHub issue form) and you commit to fixing errors publicly within 24h
- [ ] Legal sanity check on the framing: facts only ("said X, outcome was Y"), no claims about honesty or intent. Get advice if you are unsure.
- [ ] Not financial advice notice is in the footer (it is)

## Product Hunt copy (draft)
- Name: Receipts
- Tagline (<=60 chars): Every prediction, checked. Who was actually right?
- Description: Receipts tracks public, dated predictions by creators and pundits and checks them against real data. Every receipt links to the original quote. Nobody is ranked until they have 10 resolved claims, using a conservative score so lucky streaks can't win. Submit a prediction or dispute one on GitHub.
- First comment: why you built it, how scoring works (link /methodology.html), and an honest line on limits: hit rate is not skill, and we only score clear numeric claims.

## Known limits
- Only numeric price-style claims (an asset, a level, a deadline). Politics/sports need other resolvers.
- Transcript collection is manual. Check each platform's terms before collecting at scale.
- Price data is supplied by you as CSV (the build has no network access to price APIs).
- Share cards are SVG by default (many networks ignore SVG previews); use `--png` for social previews.
