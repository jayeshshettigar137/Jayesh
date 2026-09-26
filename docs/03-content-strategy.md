# 03 — Content Strategy

Every piece of content has to do at least one of these: **show real chess improvement**, **grow the audience**, **build trust**, **move someone one step down the funnel**.

## Positioning

Not "chess coach". It's **"Former state champion attempting a 1500 → 2000 comeback in 30 days."** A documented experiment. People follow it like a series.

## Pillars (target mix, tracked by `python3 -m tracker content`)

| Pillar | Share | Examples |
|---|---|---|
| **Journey** | ~40% | Daily rating update, "I dropped 87 today", milestone clips, weekly recap |
| **Educational** | ~25% | "3 mistakes keeping 1500s stuck", "How I calculate without moving pieces", "How I analyse every loss" |
| **Entertainment** | ~20% | Queen sacs, weird openings, "Can a 1500 beat Stockfish level X?", time-scramble finishes, challenging higher-rated players |
| **Personality / Story** | ~10% | Desk setup, routine, childhood championship memory (blurred), frustration and celebration |
| **Product** | ~5% | "I'm putting my whole training system into a guide" (soft, demand-first) |

---

## Instagram

**Cadence:** 2–4 Reels/day **if sustainable**. Two good Reels beat four rushed ones. Stories daily (rating check-ins, polls, "guess the move").

**Formats:**
1. Rating update (title card → the key moment → end number)
2. Game highlight (best moment, 15–30s)
3. Puzzle ("Can you find it?" with the answer at the end or in the comments. Drives comments and rewatches)
4. Mistake breakdown ("This move cost me 40 rating")
5. Emotional moment (tilt, relief, the mouse-slam-free version of frustration)
6. Training progress (notebook calc drill, puzzle streak)
7. Challenge update ("Day 18. Something changed.")
8. Mystery beat (see the mystery arc in `01-brand-and-story.md`)

**Reel anatomy (20–40s):**
```
0.0–1.5s  DAY X/30 · RATING · TARGET card + spoken hook
1.5–3s    Position on screen, tension stated
3–25s     The moment (arrows, eval bar, clock)
25–35s    Lesson in one sentence
last 2s   "Day X. RATING. N to go." + CTA (follow / comment / link)
```

**Carousels** (1 per 2–3 days): "3 mistakes I made in this game", "My training day in 6 slides", the weekly rating graph. They get saves, which are a strong ranking signal for educational content.

---

## YouTube

**Long-form:** ~1/week, 8–15 minutes. Each one should also yield 3–5 Shorts.

| Week | Video |
|---|---|
| 0 / Day 1 | **"I Have 30 Days to Reach 2000 Chess.com"** (the story, the math, the credential, the rules) |
| 1 | **"I Trained Chess for 7 Days — Here's What Happened"** (diagnosis + top-3 weaknesses) |
| 2 | **"I Played 20 Games Against 1800s"** or **"I Tried Everything Chess Coaches Tell 1500s"** (pick based on the real week) |
| 3 | **"I Finally Reached 1900…"** (only if true; otherwise "I Hit a Wall at 1800" etc.) |
| 4 | **"1500 → 2000 in 30 Days — The Final Attempt"** |
| Reveal | **"You've Been Watching Me for 30 Days. Here's Who I Am."** |

Titles follow reality. Write the title **after** the week happens, and keep a pair of alternate titles for good and bad weeks.

**Long-form structure:** cold open on the most dramatic real moment (0–20s) → the stakes (rating, days left) → the week in 3 acts → the lesson (educational value) → the number → next week's challenge → CTA to the free plan.

Shorts: a daily Short mirrors the day's best Reel.

---

## Repurposing engine

One serious session →

| Asset | Example (from an 1850 loss) |
|---|---|
| Reel 1 | "I threw away a winning position." |
| Reel 2 | "This one move cost me 40 rating." |
| Reel 3 | "Can you find the move?" (puzzle from the game) |
| Carousel | "3 mistakes I made in this game" |
| YouTube segment | Full analysis inside the weekly video |
| Stories | "Rating dropped to 1812." Poll: "Will I be back above 1850 tomorrow?" |
| Email | The lesson + the position + a link to the free plan |
| Community post | Position + "what would you play?" |

`python3 -m tracker report` picks the **best game for content** each day using rating swing, upset size, and the `content_worthy` flag.

---

## Content analytics & the winner loop

Log every Reel/Short in `data/content.csv`: hook, topic, pillar, format, length, views, avg watch time, completion %, likes, comments, shares, saves, profile visits, followers gained, CTA, conversions.

`python3 -m tracker content` ranks **hooks, topics, formats, length buckets and CTAs** by a composite score (views, completion, share rate, save rate, follow rate) and generates **variations of the winners**.

**Don't publish 100 unrelated ideas. Find winners, then build clusters around them.**

If "Why 1500s keep blundering queens" hits, the next week has:
- "Why 1600s keep blundering queens"
- "3 queen blunders every 1500 should stop making"
- "I stopped blundering queens after learning this"
- "Can you spot my queen blunder?"

Rule of thumb: **70% proven formats / 30% experiments.** Retire a format after ~5 posts below the account median.

---

## 30-day content calendar (skeleton, fill with real results)

| Day | Anchor Reel | Pillar | Notes |
|---|---|---|---|
| 1 | "I'm 1500. I have 30 days to hit 2000." | Journey | + YouTube launch video, + free plan in bio |
| 2 | "The math says I need ~60 more wins than losses." | Educational | Real numbers from config |
| 3 | First big game moment (win or loss) | Journey | |
| 4 | "I was a state champion before I was 10." | Personality / Mystery | Blurred trophy |
| 5 | Puzzle from own game | Entertainment | |
| 6 | "This mistake keeps showing up in my games" | Educational | From mistake DB |
| 7 | "Day 7. I found the biggest weakness in my game." | Journey | + weekly YouTube |
| 8–13 | Daily rating + 1 educational + 1 entertainment | Mixed | Begin email CTA |
| 14 | Week-2 recap + "I used to be much stronger than I am today." | Journey / Mystery | + YouTube |
| 15–20 | Continue. Lean into whichever format is winning | Mixed | Soft product mention (≤5%) |
| 21 | "I've been hiding something from you." + recap | Mystery / Journey | + YouTube |
| 22–27 | Milestone clips, personalised training content | Mixed | Waitlist for Improvement Pack |
| 28 | "Day 28. [rating]. [N] points left." | Journey | Every milestone gets a Story |
| 29 | "Tomorrow, you meet the person behind the account." | Mystery | |
| 30 | The final attempt (real result) | Journey | + final YouTube |
| 31 | The reveal | Personality | Reveal video + offer launch |

## CTAs (rotate, one per piece)

| Stage | CTA |
|---|---|
| All | "Follow to see if I make it." / "Comment your rating." |
| From Week 1 | "My full 1500 → 2000 training plan is free, link in bio." |
| From ~1700 | "Improvement Pack waitlist in bio." |
| Coaching stage | "I'm opening a few coaching slots. Details in bio." |
