# 02 — 30-Day Training Plan

> 1500 → 2000 in 30 days is a **stretch goal**. This plan maximises the chance. It doesn't guarantee anything.

## The honest math (also good content)

- Target: **+500** in 30 days = **~16.7 points/day** on average.
- On Chess.com Rapid, a win against an equal opponent is worth roughly **+8** once your rating is established. So +500 means about **60 more wins than losses** against equal opposition, and the opposition gets stronger as you climb.
- That's realistic **only if your true strength is well above 1500** (rust, not ceiling). A former ~1700 player who used to be a strong junior has a real case for that. The first 7 days test this hypothesis.
- **Film a video about this math on Day 1.** It sets expectations honestly and makes the challenge look as hard as it is.

Decide the **rating pool publicly on Day 1** (recommended: **Rapid**, since ~70% of games are rapid) and never switch. The 1700 historical peak: say which pool it was in.

---

## Daily structure (4–6 hours)

| Block | Time | What |
|---|---|---|
| 1. Tactics | 60 min | Puzzles **untimed**, solve fully before moving. Log accuracy % |
| 2. Calculation without moving pieces | 45 min | Look at a position, write the line in the notebook, then check. Start at 3 ply and build to 7+ |
| 3. Opening repertoire | 45 min | Plans and typical structures, **not** long engine lines |
| 4. Endgames | 30 min | Theoretical (Lucena, Philidor, K+P) + practical conversion |
| 5. Serious games | 90–120 min | Mostly rapid. Full attention, no second screen |
| 6. Game analysis | 60 min | Protocol below. **Before** any engine |
| 7. Content | 60–90 min | Clip, script, voice, post |

**Quality > volume.** No 30–50 blitz-game days.

**Game mix:** ~70% Rapid · ~20% Blitz · ~10% Bullet (bullet only as a fun or content session, never when tilted).

Suggested time control: **15|10** (or 10|0 if the schedule is tight). 15|10 gives time to actually calculate, which is the skill being trained. Adjust on Day 7 based on data.

---

## Game Analysis Protocol

Use `templates/game-review.md`. Every serious game gets a row in `data/games.csv`.

**Before the engine:**
1. Where did I first feel uncomfortable?
2. What candidate moves did I consider at the critical moment?
3. What did I miss?
4. Classify each real mistake: `tactical` · `calculation` · `positional` · `opening` · `endgame` · `time`

**Then the engine.** Only after the four answers are written down. Compare, and note anything you completely missed.

**Log it.** `mistake_categories` in `games.csv` (semicolon-separated). `python3 -m tracker mistakes` builds the database:

```
tactical      37  ██████████████████
time          23  ███████████
calculation   19  █████████
opening       14  ███████
endgame       11  █████
```

The plan **adapts to this database**. The generic curriculum only applies until you have data.

---

## Phase 1 — Days 1–7: DIAGNOSE

Goal: find out where the rating is actually being lost. Don't obsess over the number yet.

- **10–20 serious rapid games**, all fully analysed.
- Establish the mistake database baseline.
- Build a **simple, playable** repertoire (below).
- Measure: tactics accuracy, calculation depth, time usage (how often you're under 2 minutes).

### Repertoire (reach middlegames you understand)

Fill in `templates/repertoire.md`. Principles:

**White** (pick one first move and stick to it):
- vs **1…e5**: one system (e.g. Italian with c3/d3 plans, or Scotch). Know the plans, not 20 moves of theory.
- vs **1…c5**: one anti-Sicilian or Open Sicilian, depending on taste. At this level an Alapin (2.c3) or Rossolimo keeps the theory load light.
- vs **1…d5 / Scandinavian**: one line (e.g. 3.Nc3 Qa5 main ideas).
- vs **unusual** (1…b6, 1…g6, 1…d6, etc.): a "setup" answer: centre + development + castle.

**Black:**
- vs **1.e4**: one reply you already have history with (childhood repertoire is gold here, since those patterns come back fastest).
- vs **1.d4**: one system (e.g. QGD structure, or a setup like the Slav/Stonewall-style if it matches your style).

Rule: if a line costs more than 45 minutes/day to maintain, it's too big for 30 days.

**End-of-phase deliverable (Day 7):** top-3 weaknesses in writing. This becomes the Day 7 video ("I found the biggest weakness in my game").

---

## Phase 2 — Days 8–20: INTENSIVE CLIMB

Focus: calculation · tactics · serious games · analysis · fixing recurring mistakes · practical decisions.

**After a loss:**
```
STOP → ANALYSE → IDENTIFY PATTERN → TRAIN PATTERN → then queue again
```

Example: missed a back-rank tactic → **don't** queue. Spend 20 minutes on back-rank puzzle sets first.

**Stop rules** (the tracker's daily report flags these automatically):
- **2 losses in a row** → mandatory 15-min break + analysis before the next game.
- **3 losses in a row** or **−50 rating in a day** → session over. Train, don't play.
- **Time-management mistakes are your #1 category** → play longer controls, use a "3 candidate moves" checklist on critical moves, bank time in the opening.

---

## Phase 3 — Days 21–27: PERSONALISE

Target range: **1800–1900+ if progress allows.** Training is now driven entirely by the mistake database:

| If you mostly… | Train |
|---|---|
| Lose winning positions | Conversion, simplification, endgames, "blunder check" before every move once ahead, time management |
| Lose in the opening | Repertoire refinement, typical plans, tactical motifs from your openings |
| Miss tactics | Themed puzzle sets on the exact motifs you missed (the database tells you which) |
| Miscalculate | Longer visualisation drills, writing lines down, checking forcing moves first |
| Get flagged / rush | Longer controls, clock-checkpoint habits (e.g. ≥ half your time left at move 20) |
| Drift positionally | Annotated master games in your openings' structures, "what does my worst piece want?" |

Don't follow a generic curriculum here.

---

## Phase 4 — Days 28–30: FINAL PUSH

Goal: 2000 if it's realistically reachable. No marathon just because the clock is running out.

- **Sleep ≥ 7.5h.** Morning games if that's when you're sharpest (check the data).
- Only your **strongest time control**.
- Short sessions (4–6 games), stop rules strictly enforced.
- Light tactics warm-up (20 min) before playing, no heavy study.
- **Record everything.** Every milestone (1907 → 1934 → 1968 → 1989 → …) is a Story/Reel.

If 2000 becomes mathematically unrealistic, **say so on camera** and reframe: "highest rating in N years", "+X in 30 days". That honesty is worth more than a fudged ending.

---

## Weekly review (Sundays)

Use `templates/weekly-review.md`: rating graph, mistake-category trend, what changed in training, the best/worst game, and the plan for next week. This doubles as the weekly YouTube script outline.

## Fair play (protects the brand)

A faceless account gaining 400+ points in a month **will** get accused of cheating. So:
- **Never** open an engine, analysis board or opening explorer during a game.
- Record the **full, uncut screen** of every serious game and keep the files (they're gitignored, store them privately).
- Publish some complete, unedited games so viewers can see how you actually think and play.
