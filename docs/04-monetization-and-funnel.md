# 04 — Monetization & Funnel

**Don't wait for 2000 to monetize. Don't sell before trust.** Offers unlock with **real proof** (actual rating, actual student outcomes). They don't unlock on a calendar date.

## Funnel

```
Instagram / YouTube
        ↓
FREE: "1500 → 2000 Training Plan"   (email capture, available from Week 1)
        ↓
EMAIL / COMMUNITY                   (weekly: real update + one lesson + one position)
        ↓
₹499–₹999: Chess Improvement Pack
        ↓
₹4,999: Group Improvement Program (4-week cohort)
        ↓
₹10k+: Premium 1:1 coaching
        ↓
Flagship course
```

## Stage-gated offers

`python3 -m tracker report` reads the current rating and suggests the stage.

### Stage 1: ~1500–1700 · Build the list
- Free lead magnet: **"1500 → 2000 Training Plan"**. Basically `docs/02-training-plan.md` + the templates, polished as a PDF/Notion page.
- Low-ticket product: **"1500 → 2000 Chess Improvement Pack"** at ₹499–₹999
  - 30-day training schedule
  - Tactical checklist ("before every move": checks, captures, threats, both sides)
  - Game review template (the pre-engine protocol)
  - Opening preparation template
  - 30-day tracker + training log (spreadsheet/Notion version of `data/`)
- Metric that matters: **email subscribers**, not revenue.

### Stage 2: ~1700–1850 · Begin coaching
- 1:1 sessions at ₹1,000–₹2,000/session, depending on demand and proof.
- Positioning: *"Former 2× Goa State Champion (U7 & U9) · 1700+ Chess.com · Helping intermediate players improve."*
- Start with a few **discounted early students** in exchange for permission to share **real, attributed** results later. Never write testimonials yourself.

### Stage 3: ~1850–2000 · Group program
- **"1500 → 1800 Chess Accelerator"**: a 4-week cohort.
- Example scenario (**not a forecast**): 20 students × ₹4,999 = ₹99,980 gross.
- Includes: the curriculum, weekly group game reviews, a mistake-database setup for each student, a community chat.

### Stage 4: 2000+ · Flagship
- **"The 1500 → 2000 Chess System"** course: ₹7,999–₹14,999.
- Premium coaching: potentially ₹20,000–₹40,000+/month.

**Pricing has to be justified by** playing ability, **student outcomes**, curriculum depth, personal feedback, access and proof. Reaching 2000 doesn't automatically make coaching worth ₹40k/month. Student results do.

## If 2000 isn't reached

The business still works. The offer is built around **the system and the documented process**, not a magic number. Position honestly: *"+X rating in 30 days, every game documented."* Use the real peak rating in all copy.

## Long-term ecosystem

```
FREE CONTENT → EMAIL LIST → DIGITAL PRODUCTS → GROUP COACHING → 1:1 → COURSE → MEMBERSHIP → SPONSORSHIPS → AFFILIATES
```

Future products (build only when demand shows up in comments, DMs, waitlists):
- 1500→1800 course, 1800→2000 course
- Opening repertoire packs
- Tactical/puzzle packs themed by mistake type
- Chess Notion/Excel trackers (this repo's `data/` + `tracker/` is the prototype)
- Tournament preparation program
- Community/membership
- Sponsorships/affiliates: chess platforms, boards/clocks, courses. **Only products actually used**, always disclosed.

## AI Chess Improvement System (later)

```
Student uploads Chess.com/Lichess games
  → engine analysis of every move
  → detect recurring weaknesses
  → categorise: tactical · calculation · opening · positional · endgame · time
  → personalised training plan
  → puzzles generated from their own weakness patterns
  → progress tracking
  → coach reviews the most important games
```

Positioning: *"Personalised chess improvement powered by AI + coaching."*

**Don't build it yet.** Prove the content → email → coaching funnel first. This repo's `tracker` (mistake database + rule-based recommendations) is effectively the manual MVP. If coaching students ask for "the tracker you use", that's the demand signal.

## Metrics to watch (weekly)

| Funnel step | Metric |
|---|---|
| Reach | Views, profile visits |
| Follow | Followers gained per 1k views |
| Capture | Link clicks → email sign-ups (conversion %) |
| Nurture | Email open rate, replies |
| Buy | Sales, conversion from list |
| Deliver | Student rating change after 4 weeks (the proof for the next stage) |
