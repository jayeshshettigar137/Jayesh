# 06 — Channel Launch Kit (Instagram + YouTube)

Everything needed to start both channels from zero: recording, setup, bios, the posting schedule, the daily workflow and the first week, post by post.

Times are **IST**. They're starting points. After 2 weeks, move them to whenever your Insights say your audience is online.

---

## 1. Recording: yes, record every rated game

Record **every rated 10-minute game** from today, including the games before Day 1. Reasons:

1. **You can't predict the viral game.** The blunder you'd have skipped is often the best clip.
2. **Fair-play proof.** An anonymous account climbing 400+ points gets accused of cheating. Uncut recordings are your defence.
3. **Your Shorts Smith tool needs raw footage.** No recording, no clip.
4. **Pre-challenge games are "before" footage** for the reveal video and the Day 30 comparison.

### Setup (once)

| Setting | Value |
|---|---|
| Software | OBS Studio (free) |
| Canvas | 1920×1080, 30 fps |
| Format | MKV (survives crashes), remux to MP4 afterwards (OBS: File → Remux) |
| Quality | CQP/CRF ~23. A 10-min game (~15 min with setup) comes to roughly 0.3–0.8 GB |
| Audio | Mic **off** during serious games (live commentary costs you rating). Record the voiceover afterwards |
| Naming | `D05_G3_L_1532.mkv` = Day 5, game 3, loss, rating after |

**Privacy at the source.** In OBS, add a **black Color Source rectangle over your username and your opponent's username** (the player bars). Leave the clocks and board visible. Then every raw file is already anonymous, and Shorts Smith can never export a clip with your name in it. Also: close other tabs, turn off notifications, hide the bookmarks bar, and put the browser in full-screen/kiosk mode so the URL (which contains the game ID) never shows.

### Storage

- Keep **all** raw games until the reveal is published (it's your audit trail). Use an external drive or cloud folder. `recordings/` is gitignored.
- After a game is clipped and analysed, you can re-encode it smaller for the archive. Don't delete it.

### 10|0 as your main time control

10 minutes counts as **Rapid** on Chess.com, so it matches the plan. Stick to **10|0 for every rated game** in the challenge so the rating you report is one clean pool. If the mistake database shows `time` as a top-2 category after Day 7, test 15|10. Otherwise stay on 10|0.

**Marking moments while you play:** keep the notebook next to you. Right after each game (not during it), write down 1–3 moments: `move 23: hung knight`, `move 31: found mate`. Those become the timestamps you feed Shorts Smith, so you don't have to scrub through footage.

---

## 2. Account setup (Day −3 to Day 0)

### Separate identity first
- [ ] New Gmail under the brand (e.g. `the2000project.chess@gmail.com`). Don't use the personal phone number for recovery if you can avoid it.
- [ ] New Instagram created **from that email**, on a device/browser where you're **not** logged into your personal IG. Refuse contact syncing and "find friends". Syncing suggests the account to people you know.
- [ ] Don't follow or like anything from your personal accounts, and don't follow people who know you.
- [ ] YouTube channel created from the **brand Google account**, not your personal Google account.
- [ ] Before locking the name, check the handles (checklist in `01-brand-and-story.md`).

### Instagram

| Field | Value |
|---|---|
| Account type | Professional → **Creator**, category *Digital creator* (or *Gamer*) |
| Username | `the2000project` (fallbacks: `the2000project.chess`, `2000project`) |
| Name field (searchable, 30 chars) | `The 2000 Project \| Chess` |
| Profile photo | Black background, white bold **"2000"**, small pawn/king silhouette. The same image everywhere |
| Link | At launch: your YouTube channel. From Day 5–7: the free training plan (email capture) |
| Highlights | `DAY 1–7` · `DAY 8–14` · `RATING` · `TRAINING` · `Q&A` (black covers with white text) |
| Settings | Allow Remixes, turn on captions, keep the account public |

**Bio** (fits in 150 characters):
```
♟️ 1500 → 2000 · Chess.com Rapid
30 days. One goal. Real results only.
Former 2× Goa State Champion (U7 & U9)
Day 1/30 ↓
```
Update the last line **every day** (`Day 12/30 · 1712 ↓`). The bio doubles as a live scoreboard.

### YouTube

| Field | Value |
|---|---|
| Channel name | `The 2000 Project` |
| Handle | `@The2000Project` |
| Profile photo | Same as Instagram (800×800) |
| Banner (2560×1440, text inside the 1546×423 centre) | `1500 → 2000 · 30 DAYS · REAL RESULTS` + a smaller line: `Daily Shorts · New video every Sunday` |
| Audience | "No, it's not made for kids" |
| Country | India |
| Channel keywords | `chess, chess.com, road to 2000, chess improvement, 1500 to 2000, rapid chess, chess comeback, chess training` |
| Links | Instagram, free training plan (from Week 1) |
| Channel trailer | Your Day 1 video, once it's up |

**Channel description:**
> A former 2× Goa State Champion (U7 & U9) peaked around 1700, fell back to ~1500, and is now trying to reach 2000 on Chess.com Rapid in 30 days.
>
> Every game recorded. Every rating drop shown. Every lesson explained. No fake results, and no promise that 2000 happens. You'll see the real number either way.
>
> 🎯 Daily Shorts: rating updates, blunders, puzzles, lessons
> 🎬 Every Sunday: the full week, analysed
>
> Who's behind the account? You'll find out.

---

## 3. Posting schedule

### Daily rhythm (start here, build up only once it runs smoothly)

| Time (IST) | Instagram | YouTube |
|---|---|---|
| 9:00 am | Story: `DAY X/30 · RATING XXXX` card + "today's plan" | — |
| 1:00 pm | **Reel A**: educational/puzzle from **yesterday's** games | **Short A** (same clip, uploaded natively) at 2:00 pm |
| During play | Stories: "Game 3… 😬", rating after each session | — |
| 7:30 pm | **Reel B**: **today's** journey/rating update (the main post) | **Short B** at 8:30 pm |
| 9:30 pm *(optional, from Week 2)* | Reel C: entertainment (weird opening, time scramble, brilliant move) | Short C the next morning |
| 10:00 pm | Story poll: "Will I be above XXXX tomorrow?" | — |

- **Weeks 1–2: 2 Reels + 2 Shorts per day.** Only go to 3 once batching runs smoothly. Two good posts beat four rushed ones.
- Upload the **original file** to each platform. Never repost a clip with another app's watermark.
- Short B can go out same-day. Reel A is batched the night before and scheduled with Meta Business Suite / YouTube Studio.

### Weekly rhythm

| Day | Extra |
|---|---|
| Mon–Fri | Daily rhythm |
| Wed | Carousel: "3 mistakes I made this week" (gets saves) |
| Sat | Carousel: weekly rating graph + a Story Q&A box ("ask me anything, except who I am") |
| **Sun 6:00 pm** | **YouTube long-form** (8–15 min). Reel teaser at 7:30 pm pointing to it. Community post on YouTube |

---

## 4. Daily production workflow (with Shorts Smith)

```
PLAY (record all) → NOTE 1–3 moments per game → ANALYSE (pre-engine, then engine)
→ PICK 2–3 moments → SHORTS SMITH clips → VOICEOVER + TITLE CARD → CAPTIONS → SCHEDULE → LOG in data/content.csv
```

| Block | Time |
|---|---|
| Play ~6–8 rated 10|0 games (recorded) | ~2 h |
| Analyse the losses + the best game | 60 min |
| Pick moments, run Shorts Smith, voiceover, captions | 60–75 min |
| Schedule, reply to comments, log stats | 15–20 min |

### Every clip must have
- **9:16, 1080×1920**, 20–40 seconds (Shorts under 60s).
- **0–1.5s: the title card** `DAY X/30 · RATING XXXX · TARGET 2000` + the spoken hook.
- **Board on screen by second 2.** Arrows/eval bar at the key moment.
- **Burned-in captions**, 2–4 words at a time, kept out of the bottom ~20% and the right edge (where the like/comment buttons sit).
- **Last 2s:** `Day X. XXXX. N to go.` + one CTA.
- A **cover image** with the rating number big (it makes the profile grid readable).
- **Check every export** for usernames, game URLs, tabs and notifications before posting. The OBS mask handles most of this, but check anyway. Also check that any auto-generated titles/captions from Shorts Smith don't pull in identifying text.

### Caption templates

**Instagram:**
```
Day 5/30. 1532 → 1471. 😩

Hung a knight in a winning position and tilted for 3 more games.
Lesson: blunder-check before every capture. Checks, captures, threats, for BOTH sides.

Would you have seen it? Comment your rating 👇
Following along to see if I reach 2000? Hit follow.

#chess #chesscom #chessimprovement #roadto2000 #chessreels
```
Use 3–5 hashtags, always the same core set plus one topic tag.

**YouTube Short title:** `Day 5/30: I dropped 61 rating in one day 😩 #chess`
**Short description:** 2 lines + `Full week every Sunday → @The2000Project` + `#chess #shorts #chesscom`

**Long-form title:** decide after the week. Keep the good-week and bad-week options from `03-content-strategy.md` ready.

---

## 5. Engagement rules

- **First 60 minutes after each post:** reply to every comment (with a question back if possible).
- **Pin a comment** on every Reel/Short: "What's your rating? I'm reading every comment."
- Every post ends with **one question** (rating, "find the move", "will I make it?").
- Turn good comments into content: "A 2100 in my comments told me to stop playing the Caro-Kann…"
- Stories daily: polls and quizzes ("Which move? A / B") are the cheapest engagement there is.
- **Never** argue about the "fake" or "cheater" comments. Reply once, calmly: "Every game is recorded uncut. The full games are coming on YouTube."

---

## 6. Launch week, post by post

Launch with **3 Reels already on the profile** so a new visitor sees a story rather than an empty grid. Pin all 3.

| Day | Instagram | YouTube |
|---|---|---|
| **Day 0 (launch)** | Pin 1: **"I'm 1500. I have 30 days to hit 2000."** (the challenge + the rules) · Pin 2: **"The math says I need ~60 more wins than losses."** · Pin 3: **"I was a state champion before I was 10."** (blurred trophy) | Short versions of Pins 1–3 · **Long-form: "I Have 30 Days to Reach 2000 Chess.com"** (set as channel trailer) |
| **Day 1** | A: my Day 1 openings/"repertoire I'm betting on" · B: **Day 1 rating update** | Shorts A + B |
| **Day 2** | A: puzzle from Day 1 ("Can you find it?") · B: Day 2 update | Shorts |
| **Day 3** | A: first mistake breakdown ("This mistake cost me X rating") · B: Day 3 update | Shorts |
| **Day 4** | A: "How I analyse every loss before the engine" · B: update · Story: first poll | Shorts |
| **Day 5** | A: best/worst moment so far · B: update · **Switch the bio link to the free training plan** | Shorts |
| **Day 6** | A: entertainment clip (time scramble / weird opening) · B: update | Shorts |
| **Day 7** | A: **"Day 7. I found the biggest weakness in my game."** · B: update · Sat carousel | **Sunday long-form: "I Trained Chess for 7 Days — Here's What Happened"** |

Every "update" Reel uses the **real** number from `python3 -m tracker status`, including the drops.

---

## 7. Week-1 checks (adjust on Day 7)

Run `python3 -m tracker content` and look at:

| Metric | Healthy early signal | If it's weak |
|---|---|---|
| 3-second hold / first-frame retention | >60–70% | Hook is too slow. Put the number or the tension in the first 1.5s |
| Average watch % | >50% for 20–30s clips | Cut the dead time, go shorter |
| Shares + saves | Growing post to post | More puzzles and "mistakes 1500s make" |
| Follows per 1k views | Anything consistent | Make the "Day X/30" series format more obvious, and ask for the follow |

Then do more of what's winning: **70% proven formats / 30% experiments** (see the winner loop in `03-content-strategy.md`).

---

## 8. Pre-launch checklist

- [ ] Brand email, IG, YouTube created. No links to personal accounts
- [ ] Handles match across IG and YouTube
- [ ] Profile photo, banner, highlight covers made
- [ ] OBS scene with username masks, tested on one casual game
- [ ] Title-card template in your editor / Shorts Smith (`DAY X/30 · RATING · TARGET 2000`)
- [ ] `config.json` start date + start rating set to the real values
- [ ] 3 launch Reels + the Day 1 YouTube video recorded, edited and privacy-checked
- [ ] Free training plan page ready (or ready by Day 5)
- [ ] Rating pool (Rapid, 10|0) announced in the first video

---

## 9. Automatic posting plan from your recordings folder

The tracker reads the **file names** in your recordings folder (e.g. `J:\chess clips`) and writes everything for each slot of the daily schedule: which clip to use, style, title card, hook, voiceover outline, Instagram caption + hashtags, YouTube Short title and description, pinned comment, Story text, and on Sundays the long-form title options, outline and thumbnail text.

It never opens the videos. It only knows what the file name says. Anything it can't know (what you missed, the move you played, the lesson) is left as a `[FILL: ...]` slot for you to write from your game review.

### One-time setup on your PC (Windows)

1. Install Python from python.org and tick **"Add python.exe to PATH"** during install.
2. Download this repo (GitHub → Code → Download ZIP, or `git clone`) to e.g. `C:\the2000project`.
3. Set the real `start_date` and `start_rating` in `config.json`.
4. Double-click **`make_posting_plan.bat`**. It reads `J:\chess clips` (edit the `RECORDINGS` line if the folder changes).

Output goes to `J:\chess clips\_posting_plan\`:

| File | What |
|---|---|
| `2026-10-02.md` (one per day) | Everything to post that day, slot by slot |
| `schedule.csv` | Every post with date/time/platform/clip/hook (opens in Excel) |
| `_file-name-check.md` | Words it didn't understand, files missing a result or rating, and pre-challenge recordings |

Re-run it after every session. With `--log-games` (the .bat does this) it also adds each game to `data/games.csv`. Then fill in `mistake_categories` and `key_lesson` there.

### How to name recordings

Any order, separated by `_` or spaces. Everything is optional, but **result + rating** make the hooks use real numbers.

```
D5_G3_L_1532_vs1610_caro_blunder_black.mp4
│  │  │  │     │      │     │       └ colour: white / black
│  │  │  │     │      │     └ style words (table below)
│  │  │  │     │      └ opening
│  │  │  │     └ opponent rating (vs1610)
│  │  │  └ your rating AFTER the game
│  │  └ W / L / D (or win / loss / draw)
│  └ game number that day
└ challenge day (D5 or day5)
```

If there's no `D5`, the day comes from the date in the name (OBS default `2026-10-05 21-14-05.mkv`) or the file date.

**Style words the tool recognises:**

| Write | Becomes |
|---|---|
| `blunder`, `hung`, `missed`, `threw`, `tilt` | Mistake breakdown (educational) |
| `queen sac` | Queen sacrifice highlight (top priority) |
| `sac`, `gambit`, `brilliant`, `comeback`, `swindle`, `trap`, `upset` | Highlight (entertainment) |
| `mate`, `backrank`, `smothered` (in a win) | "Can you find the mate?" puzzle |
| `scramble`, `flag`, `flagged`, `lowtime` | Time-scramble clip |
| `endgame`, `convert` | Endgame lesson |
| `attack`, `aggressive`, `positional`, `grind` | Game highlight |
| an opening (`italian`, `caro`, `sicilian`, `london`, `qgd`, `scotch`, …) | Opening lesson + opening hashtag |
| nothing special | Rating update (journey) |

**Don't put opponent usernames in file names.** The tool ignores unknown words and won't use them in captions, but file names can still leak (screen shares, uploads).

### How clips are picked

- **Reel B, 19:30:** the strongest clip from **today** (drama + journey).
- **Reel A, 13:00:** the best lesson/puzzle from **yesterday** that hasn't been posted yet.
- A clip is never scheduled twice. Other games are listed as backup clips for Stories.
- **Sunday:** title options match the real week (gain vs loss), plus an outline built from the week's top clips.

### What still needs you

- Posting itself: schedule the posts in **Meta Business Suite** (Instagram) and **YouTube Studio** using the times in `schedule.csv`. The tool can't log in to your accounts.
- The `[FILL]` lines, from your real game review.
- A final privacy check of every exported clip.
