# The 2000 Project

> ♟️ 1500 → 2000 · 30 days · One goal
> Former 2× Goa State Champion (U7 & U9) · Day 1/30 ↓

A faceless chess challenge, content brand and digital business in one repository.

**Can a former 2× Goa State Champion (U7 & U9) climb from ~1500 to 2000 on Chess.com in 30 days?**

2000 is a **stretch goal**. We don't promise it anywhere. Whatever happens gets documented and published: gains, drops, tilt, comebacks.

---

## What's in here

| Path | What it is |
|---|---|
| [`docs/01-brand-and-story.md`](docs/01-brand-and-story.md) | Name evaluation, bio, visual identity, hooks, mystery arc, identity reveal |
| [`docs/02-training-plan.md`](docs/02-training-plan.md) | 30-day chess plan, daily schedule, game-analysis protocol, adaptive rules |
| [`docs/03-content-strategy.md`](docs/03-content-strategy.md) | Pillars, Instagram/YouTube plans, repurposing engine, 30-day content calendar, winner loop |
| [`docs/04-monetization-and-funnel.md`](docs/04-monetization-and-funnel.md) | Stage-gated products, funnel, pricing guardrails, AI product roadmap |
| [`docs/05-privacy-and-trust.md`](docs/05-privacy-and-trust.md) | Anonymity checklist, fair-play proof, brand principles |
| [`docs/06-channel-launch-kit.md`](docs/06-channel-launch-kit.md) | Recording setup, Instagram/YouTube setup and bios, posting schedule, launch week post by post |
| [`make_posting_plan.bat`](make_posting_plan.bat) | Windows double-click: builds the posting plan from `J:\chess clips` |
| [`templates/`](templates) | Game review, daily log and weekly review templates |
| [`data/`](data) | **Real** tracking data. The CSVs start empty (headers only) |
| [`tracker/`](tracker) | Python CLI that turns the CSVs into the daily report, the mistake database and content analytics |

## The daily loop

```
play + train  →  log (data/*.csv)  →  python -m tracker report  →  publish  →  log content stats  →  repeat
```

Every evening:

1. Add one row per serious game to `data/games.csv`. Do the pre-engine analysis from `templates/game-review.md` first.
2. Add one row for the day to `data/daily_log.csv`.
3. Add one row per published Reel/Short/video to `data/content.csv`, and update the stats on older rows as they come in.
4. Run the report:

```bash
python3 -m tracker report              # 10-part daily report for the latest day
python3 -m tracker report --day 12     # a specific day
python3 -m tracker report --save       # also write reports/day-XX.md
python3 -m tracker mistakes            # recurring-mistake database
python3 -m tracker content             # winning hooks/topics/formats + variations to make next
python3 -m tracker status              # one-line challenge status (good for bio/Story updates)
python3 -m tracker clips --folder "J:\chess clips" --log-games   # posting plan from your recordings
```

To see what the output looks like before you have your own data, point it at the test fixtures. They're **sample data, not real results**:

```bash
python3 -m tracker --data-dir tests/fixtures report
```

Optional: `python3 -m tracker fetch --month 2026-10` pulls your Chess.com games into `data/games.csv` (it reads your username from the `CHESSCOM_USERNAME` environment variable, so it never gets committed. See the privacy doc).

No dependencies beyond Python 3.9+. Tests: `python3 -m unittest discover -s tests`.

## Configure the challenge

Edit [`config.json`](config.json) before Day 1: start date, starting rating, the **rating pool you commit to publicly** (rapid is recommended), and the pillar mix.

## Non-negotiables

1. Real results only. No fake ratings, streaks or testimonials.
2. Nobody is ever promised 2000 in 30 days.
3. Losses and rating drops get shown. They're content.
4. The credential is always stated precisely: **"2× Goa State Champion (U7 & U9)"**.
5. Earn trust before monetizing aggressively.
