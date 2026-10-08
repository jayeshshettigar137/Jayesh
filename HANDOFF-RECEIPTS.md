# Handoff: Receipts (continue in a local session with Claude in Chrome)

Branch: `claude/fervent-bardeen-lxf5jw` of https://github.com/jayeshshettigar137/Jayesh
Written 2026-10-08 from a cloud session that could not open web pages (network policy) or reach Chrome.

## Goal
Launch **Receipts**: a public scoreboard of dated, falsifiable predictions by creators/pundits, checked against real data. Static site (no backend). Product Hunt launch after real data exists. Second locked product (later): Appeals Autopilot (see `research/13-locked-plan-receipts-and-appeals.md`).

## State: the product is BUILT, real data is EMPTY
- Code: `receipts/` (stdlib Python; Pillow + Chromium optional for PNG share cards). 19 tests pass: `python3 -m unittest discover -s tests_receipts -t .`
- Build: `python3 -m receipts build --data data/receipts --out site [--png]`. Demo: `--data data/sample` (fictional, watermarked SAMPLE).
- Deploy: `.github/workflows/pages.yml` (runs tests, builds, deploys to GitHub Pages). NOT yet run. User must set Settings -> Pages -> Source = GitHub Actions, and merge the branch to `main`.
- Config to edit: `site.json` (`url`, `repo` still placeholders OWNER/REPO; real: jayeshshettigar137/Jayesh).
- Docs: `RECEIPTS.md` (run/ship/launch checklist/PH copy), `VERIFY.md` (verification procedure).
- Data files: `data/receipts/claims.csv` (headers only), `data/receipts/resolutions.csv` (headers only), `data/receipts/prices/` (optional), `data/candidates.csv` (10 UNVERIFIED named BTC predictions), `data/sample/` (fictional).

## What is blocked (and why you are in a new session)
The cloud session could not open web pages (egress policy), so no real quote has been verified. A local session with Claude in Chrome can open the pages directly. Everything else is done.

## YOUR TASKS (in order)
1. For each row in `data/candidates.csv`, open `source_url` in Chrome (user has them open). Copy the EXACT quote and the publication/said date. Confirm who said it and that it is a clear, specific claim (level + deadline). Drop hedged or range-only items (c09 Tom Lee, c10 Brandt are probably unscorable; c07 Chamath is hedged "could"; c08 Bernstein "nearly $200,000" is not a clean threshold). Rows c04-c07 have no source URL yet: find the primary source (VanEck Mid-August 2025 Bitcoin ChainCheck; Bitwise; Samson Mow; All-In podcast 2024-05-31) and watch/read it yourself.
2. Aim for 30+ verified claims from 3+ speakers (more speakers/assets beyond BTC are fine: any public, dated, numeric claim). Ten BTC candidates alone will not fill a leaderboard (nobody is ranked below 10 resolved claims). Find more via Chrome: documented end-of-2024/2025 price predictions by named analysts/creators, each with an exact quote, date and link.
3. Add each verified claim to `data/receipts/claims.csv` (columns: `id, speaker, source_url, said_on, quote, subject, asset, direction, target, deadline, confidence, verified, sample`). `verified=yes` ONLY after you read the exact quote at the source. `sample` stays empty. `id` = letters/digits/-/_ only. `source_url` must be http(s).
4. For outcomes, get the highest (direction `above`) or lowest (`below`) daily close between `said_on` and `deadline` from a source whose terms allow it (CoinGecko historical data; check its current terms/attribution). Add to `data/receipts/resolutions.csv`: `id,best_value,best_date,as_of,source_url`. Do NOT commit raw price series (licence limits: CoinGecko needs a paid plan + attribution for commercial use; FRED is non-commercial and bans scraping/AI use; Stooq terms unknown).
5. Edit `site.json`: `"url": "https://jayeshshettigar137.github.io/Jayesh"` (confirm after enabling Pages), `"repo": "jayeshshettigar137/Jayesh"`.
6. Run tests, build with `--png`, open the site locally (`python3 -m http.server -d site 8000`) and check home, one receipt, one speaker page, mobile width, and that every source link opens.
7. Commit and push to `claude/fervent-bardeen-lxf5jw`. Do not create a PR unless the user asks. Then tell the user to merge to `main` and enable Pages.

## Non-negotiables
- Real results only. Never invent or paraphrase a quote; never publish a claim you have not read at its source. Never put made-up claims under real names (fabrication and defamation risk).
- Facts only: "said X, outcome was Y". No claims about honesty, intent or character. Include the dispute path (already on the site).
- Do not scrape YouTube or other platforms for transcripts (terms restrict automated access); read pages in the browser and quote exactly.
- Nobody ranked below 10 resolved claims (already enforced by code). Not financial advice (in footer).
- No attribution/model identifiers in commits other than the standard trailers the session setup asks for.

## Decisions already made (do not re-litigate)
- Product 1 = Receipts, Product 2 = Appeals Autopilot (locked). Static site on GitHub Pages. Python stdlib. Submissions/disputes via GitHub issue forms in `.github/ISSUE_TEMPLATE/`.
- Resolution = peak/trough in window (evidence mode) so the site never redistributes price series.
- Product Hunt only after real data and a working site exist.

## Background research (in `research/`)
`00-shortlist.md`, `01`-`10` market reports (all based on search snippets, not validated), `11-top3-big-ideas.md`, `12-saas-ideas-summary.md` + `saas-ideas-1000.csv`, `13-locked-plan-receipts-and-appeals.md`, `ideas-10000.csv`.
Competition note: no end-to-end prediction-scoring product was found in two searches (not proof). Related: TipRanks-style analyst trackers exist; check again in Chrome before launch.

## Suggested first message for the new session
"Read HANDOFF-RECEIPTS.md, RECEIPTS.md and VERIFY.md in this repo (branch claude/fervent-bardeen-lxf5jw). Use Claude in Chrome (my tabs are open) to verify the candidates in data/candidates.csv against their source pages, find more verified dated numeric predictions, fill data/receipts/claims.csv and resolutions.csv, set site.json, run tests, build, check the site, and push to the branch. Never publish a quote you have not read at the source."
