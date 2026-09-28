# Session Handoff: The 2000 Project

Summary of the cloud session so a local Claude session can pick up where it left off.

## The project

A faceless chess content brand + business. The creator is a **2× Goa State Champion (U7 & U9)** (always use this exact wording, never plain "Goa State Champion"), with a historical peak of ~1700 on Chess.com. They're now attempting **~1500 → 2000 on Chess.com Rapid in 30 days**. It's a stretch goal and must never be promised. The account stays anonymous until a reveal video after Day 30. Monetization is stage-gated by real rating and proof: free plan → ₹499–999 pack → coaching → cohort → course.

Non-negotiables: real results only, no fake ratings/streaks/testimonials, show losses, protect identity until the reveal.

## Decisions made

| Decision | Choice |
|---|---|
| Brand name | **The 2000 Project** (series title "2000 in 30"; format "DAY X/30"). Handles not yet verified |
| Rating pool | **Rapid, 10\|0** (the creator plays 10-min). Test 15\|10 only if `time` becomes a top-2 mistake category |
| Recording | Record **every** rated game (OBS, black boxes over both usernames, mic off, voiceover later) |
| Recordings folder | `J:\chess clips` on the creator's Windows PC. File names describe the game style/type |
| Clip tool | The creator has their own **Shorts Smith** tool that cuts clips (we haven't seen it) |
| Posting schedule (IST) | 9:00 Story · 13:00 Reel A (yesterday's lesson/puzzle) + 14:00 Short · 19:30 Reel B (today's update) + 20:30 Short · 22:00 Story poll · Sunday 18:00 YouTube long-form + teaser Reel |
| Bio | `♟️ 1500 → 2000 · Chess.com Rapid / 30 days. One goal. Real results only. / Former 2× Goa State Champion (U7 & U9) / Day 1/30 ↓` |

## What's in the repo (branch `claude/faceless-chess-2000-project-zs4ndc`)

- `docs/01–05`: brand & story, 30-day training plan, content strategy, monetization, privacy & trust
- `docs/06-channel-launch-kit.md`: recording setup, IG/YouTube setup + bios, posting schedule, Shorts workflow, launch week post by post, **file-naming guide** for recordings
- `templates/`: game review, daily log, weekly review, repertoire
- `data/*.csv`: real tracking data (empty, headers only)
- `tracker/` (Python stdlib CLI, `python -m tracker ...`):
  - `report`: 10-part daily report · `status` · `mistakes` · `content` (winner analytics)
  - `clips --folder "J:\chess clips" --log-games`: reads recording **file names** and writes `J:\chess clips\_posting_plan\` (one page per day, `schedule.csv`, `_file-name-check.md`), and logs games to `data/games.csv`
  - `fetch --month YYYY-MM`: Chess.com import (username from the `CHESSCOM_USERNAME` env var)
- `make_posting_plan.bat`: double-click launcher for `clips`
- `tests/`: 24 passing tests (`python -m unittest discover -s tests`); `tests/fixtures/` holds SAMPLE data only

## Open items / next steps

1. **Tune the file-name parser to the creator's real naming.** Run `python -m tracker clips --folder "J:\chess clips"` and read `_posting_plan/_file-name-check.md` for unrecognised words. Add real style words to `TAGS`/`OPENINGS` in `tracker/clips.py`.
2. Set the real `start_date` and `start_rating` in `config.json` (the start date is a placeholder: 2026-10-01).
3. Verify handles (IG/YouTube/domain) before locking the name.
4. Posting is manual: Meta Business Suite + YouTube Studio, using `schedule.csv` times. Possible later work: YouTube Data API auto-upload, the Instagram Graph API.
5. Possible later work: let the tool also read Shorts Smith output files, or generate title-card images.
6. No PR has been opened. Commit/push to the branch above only.
