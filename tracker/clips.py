"""Turn a folder of game recordings into a ready-to-post plan.

Only the file NAME is read, never the video. Everything the plan says about a
game comes from words in the file name. Words the tool doesn't recognise
(e.g. an opponent's username) are never copied into captions, and anything it
can't know (what you missed, the exact move) is left as a [FILL: ...] slot.
"""

import csv
import re
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

VIDEO_EXT = {".mp4", ".mkv", ".mov", ".webm", ".avi"}

OPENINGS = {
    "ruy lopez": "Ruy Lopez", "spanish": "Ruy Lopez", "italian": "Italian Game", "giuoco": "Italian Game",
    "two knights": "Two Knights", "fried liver": "Fried Liver", "scotch": "Scotch Game",
    "vienna": "Vienna Game", "kings gambit": "King's Gambit", "evans": "Evans Gambit",
    "sicilian": "Sicilian", "najdorf": "Najdorf", "dragon": "Dragon", "alapin": "Alapin",
    "caro kann": "Caro-Kann", "carokann": "Caro-Kann", "caro": "Caro-Kann", "french": "French Defence",
    "scandinavian": "Scandinavian", "pirc": "Pirc", "modern": "Modern Defence", "alekhine": "Alekhine",
    "petrov": "Petrov", "philidor": "Philidor", "stafford": "Stafford Gambit", "englund": "Englund Gambit",
    "london": "London System", "jobava": "Jobava London", "colle": "Colle System",
    "queens gambit": "Queen's Gambit", "qgd": "Queen's Gambit Declined", "qga": "Queen's Gambit Accepted",
    "slav": "Slav", "catalan": "Catalan", "kings indian": "King's Indian", "kid": "King's Indian",
    "nimzo": "Nimzo-Indian", "grunfeld": "Grünfeld", "benoni": "Benoni", "dutch": "Dutch",
    "english": "English Opening", "reti": "Réti", "bongcloud": "Bongcloud",
}

# tag -> words/phrases that signal it (matched as whole words on the normalised name)
TAGS = {
    "blunder": ["blunder", "blundered", "hung", "hang", "hanging", "oops", "mistake", "threw", "throw", "choke",
                "choked"],
    "missed": ["missed", "miss"],
    "brilliant": ["brilliant", "brill", "genius", "best move", "great move"],
    "sacrifice": ["sac", "sacs", "sacrifice", "sacrificed", "gambit"],
    "queen": ["queen"],
    "checkmate": ["mate", "mated", "checkmate", "smothered", "backrank", "back rank"],
    "comeback": ["comeback", "come back", "saved", "swindle", "swindled", "turnaround", "escape"],
    "time": ["scramble", "flag", "flagged", "timeout", "time trouble", "lowtime", "low time", "zeitnot"],
    "endgame": ["endgame", "ending", "conversion", "convert", "converted"],
    "tilt": ["tilt", "tilted", "rage"],
    "upset": ["upset", "higher rated", "giant"],
    "trap": ["trap", "trapped", "trick"],
    "attack": ["attack", "attacking", "aggressive", "kingside attack"],
    "positional": ["positional", "grind", "squeeze", "slow"],
    "opening_fail": ["opening fail", "out of book", "prep fail"],
    "long_think": ["calculation", "calc", "think", "long think"],
}

RESULT_WORDS = {"w": "W", "win": "W", "won": "W", "victory": "W",
                "l": "L", "loss": "L", "lost": "L", "lose": "L",
                "d": "D", "draw": "D", "drew": "D", "drawn": "D", "stalemate": "D"}
KNOWN_WORDS = (set(RESULT_WORDS) | {"white", "black", "vs", "opp", "rapid", "blitz", "bullet", "min", "day",
               "game", "rated", "chess", "aswhite", "asblack", "time", "clip", "recording", "as", "with", "and", "the", "a", "my", "in"})

CORE_TAGS = ["#chess", "#chesscom", "#chessimprovement", "#roadto2000"]


# ---------------------------------------------------------------- parsing

def normalise(stem):
    s = stem.lower().replace("'", "")
    s = re.sub(r"[_\-.,()\[\]]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _has(text, phrase):
    return re.search(rf"(?<![a-z0-9]){re.escape(phrase)}(?![a-z0-9])", text) is not None


def parse_filename(path, start_date):
    """Everything a file name can tell us about one game."""
    path = Path(path)
    text = normalise(path.stem)
    info = {"file": str(path), "name": path.name, "tags": [], "opening": None, "result": None,
            "rating": None, "opponent": None, "color": None, "time_control": None, "game_no": None,
            "day": None, "date": None}

    # OBS default names: "2026-10-03 14-30-22" -> after normalising "2026 10 03 14 30 22"
    m = re.search(r"\b(20\d{2}) ?(\d{2}) ?(\d{2})\b(?: (\d{2}) (\d{2})(?: (\d{2}))?)?", text)
    if m:
        try:
            info["date"] = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            text = (text[:m.start()] + " " + text[m.end():]).strip()
        except ValueError:
            pass

    m = re.search(r"\b(?:d|day) ?0*(\d{1,2})\b", text)
    if m:
        info["day"] = int(m.group(1))
        text = text[:m.start()] + " " + text[m.end():]
    m = re.search(r"\b(?:g|game) ?0*(\d{1,2})\b", text)
    if m:
        info["game_no"] = int(m.group(1))
        text = text[:m.start()] + " " + text[m.end():]

    m = re.search(r"\b(\d{1,2}) ?\+ ?(\d{1,2})\b", text) or re.search(r"\b(\d{1,2}) ?(?:min|mins|m)\b", text)
    if m:
        minutes = int(m.group(1))
        inc = int(m.group(2)) if m.lastindex and m.lastindex > 1 else 0
        info["time_control"] = f"{minutes * 60}" + (f"+{inc}" if inc else "")
        text = text[:m.start()] + " " + text[m.end():]

    m = re.search(r"\b(?:vs|opp|v) ?([12]\d{3})\b", text)
    if m:
        info["opponent"] = int(m.group(1))
        text = text[:m.start()] + " " + text[m.end():]
    ratings = [int(r) for r in re.findall(r"\b([12]\d{3})\b", text) if 1000 <= int(r) <= 2999]
    if ratings:
        info["rating"] = ratings[0]
        if info["opponent"] is None and len(ratings) > 1:
            info["opponent"] = ratings[1]

    for word in text.split():
        if word in RESULT_WORDS and info["result"] is None:
            info["result"] = RESULT_WORDS[word]
    for colour in ("white", "black"):
        if _has(text, colour) or _has(text, "as" + colour):
            info["color"] = colour

    matched = set()
    for key in sorted(OPENINGS, key=len, reverse=True):
        if _has(text, key):
            info["opening"] = OPENINGS[key]
            matched.update(key.split())
            break
    for tag, words in TAGS.items():
        hits = [w for w in words if _has(text, w)]
        if hits:
            info["tags"].append(tag)
            for w in hits:
                matched.update(w.split())
    if info["result"] == "D" and "stalemate" in text.split():
        matched.add("stalemate")

    # Unknown words are reported so the user can see what was ignored (possible usernames).
    info["ignored"] = sorted({w for w in text.split() if w not in matched and w not in KNOWN_WORDS
                              and not w.isdigit()})

    if info["date"] is None:
        info["date"] = datetime.fromtimestamp(path.stat().st_mtime).date() if path.exists() else None
    start = date.fromisoformat(start_date)
    if info["day"] is None and info["date"] is not None:
        info["day"] = (info["date"] - start).days + 1
    if info["day"] is not None:
        info["date"] = start + timedelta(days=info["day"] - 1)
    return info


def scan(folder, start_date):
    folder = Path(folder)
    files = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in VIDEO_EXT]
    clips = [parse_filename(p, start_date) for p in files]
    for c, p in zip(clips, files):
        c["mtime"] = p.stat().st_mtime
    return sorted(clips, key=lambda c: (c["day"] or 0, c["game_no"] or 0, c["mtime"]))


# ---------------------------------------------------------------- classification

def classify(clip):
    """Pick the content style for a clip: (format, pillar, priority score)."""
    t, r = set(clip["tags"]), clip["result"]
    upset = (clip["opponent"] or 0) - (clip["rating"] or 0) >= 50 and r == "W"
    if "tilt" in t or (("blunder" in t or "missed" in t) and r != "W"):
        return "mistake breakdown", "educational", 8
    if "sacrifice" in t and "queen" in t:
        return "highlight", "entertainment", 10
    if "checkmate" in t and r == "W":
        return "puzzle", "entertainment", 8
    if t & {"brilliant", "sacrifice", "comeback", "trap"} or upset or "upset" in t:
        return "highlight", "entertainment", 9 if upset else 7
    if "time" in t:
        return "time scramble", "entertainment", 6
    if "endgame" in t:
        return "endgame lesson", "educational", 6
    if "blunder" in t or "missed" in t:
        return "mistake breakdown", "educational", 6
    if "opening_fail" in t or clip["opening"]:
        return "opening lesson", "educational", 4
    if "attack" in t or "positional" in t:
        return "game highlight", "entertainment", 4
    return "rating update", "journey", 2


def _rating(value):
    return str(value) if value else "[RATING]"


def hook_for(clip, fmt):
    t, r = set(clip["tags"]), clip["result"]
    rating, opp = clip["rating"], clip["opponent"]
    if fmt == "mistake breakdown":
        if "tilt" in t:
            return "This is what tilt looks like at " + _rating(rating) + "."
        if r == "L":
            return "This blunder cost me the game."
        return "I almost threw this game away."
    if "sacrifice" in t and "queen" in t:
        return f"I sacrificed my queen at {_rating(rating)}."
    if fmt == "puzzle":
        return "Can you find the mate I found?"
    if r == "W" and opp and rating and opp - rating >= 50:
        return f"I'm {rating}. I just beat a {opp}."
    if "comeback" in t:
        return "I was losing. Then this happened."
    if "trap" in t:
        return "My opponent walked right into this trap."
    if "brilliant" in t:
        return "I found the best move with seconds to think."
    if "sacrifice" in t:
        return "I gave away material on purpose."
    if fmt == "time scramble":
        return "This game came down to the clock."
    if fmt == "endgame lesson":
        return "How I converted this endgame." if r == "W" else "I couldn't convert this endgame."
    if fmt == "opening lesson":
        return f"What I learned playing the {clip['opening']} today." if clip["opening"] else \
            "This opening lesson cost me rating."
    return "I'm 1500. I have 30 days to hit 2000."


def hashtags(clip, fmt):
    extra = []
    if clip["opening"]:
        extra.append("#" + re.sub(r"[^a-z]", "", clip["opening"].lower()))
    extra += {"mistake breakdown": ["#chessblunder"], "puzzle": ["#chesspuzzle"], "endgame lesson": ["#endgame"],
              "time scramble": ["#rapidchess"], "highlight": ["#chesstactics"]}.get(fmt, [])
    return " ".join(CORE_TAGS + extra[:1])


# ---------------------------------------------------------------- plan building

def day_ratings(clips, start_rating, daily=None):
    """End-of-day rating per day: daily_log first, else the last rating in that day's file names."""
    end = {}
    for c in clips:
        if c["day"] and c["rating"]:
            end[c["day"]] = c["rating"]
    for row in daily or []:
        if row.get("rating"):
            end[row["day"]] = row["rating"]
    return end


def rating_before(day, end, start_rating):
    prev = [d for d in end if d < day]
    return end[max(prev)] if prev else start_rating


def pick(clips, prefer, used=()):
    """Highest-priority clip not already posted, preferring the given pillars."""
    clips = [c for c in clips if c["file"] not in used]
    if not clips:
        return None
    scored = []
    for c in clips:
        fmt, pillar, score = classify(c)
        scored.append((score + (3 if pillar in prefer else 0), c))
    return max(scored, key=lambda x: x[0])[1]


def slot_block(title, when, clip, day, cfg, rating_text, to_go_text, platform_note):
    fmt, pillar, _ = classify(clip)
    hook = hook_for(clip, fmt)
    tags = ", ".join(clip["tags"]) or "none"
    facts = " · ".join(x for x in (
        f"{clip['result']}" if clip["result"] else None,
        f"as {clip['color']}" if clip["color"] else None,
        f"vs {clip['opponent']}" if clip["opponent"] else None,
        clip["opening"], f"rating after {clip['rating']}" if clip["rating"] else None) if x)
    card = f"DAY {day}/{cfg['challenge_days']} · RATING {rating_text} · TARGET {cfg['target_rating']}"
    ig_caption = (
        f"{hook}\n\nDay {day}/{cfg['challenge_days']}. {rating_text}. {to_go_text} to go.\n\n"
        f"[FILL: one sentence on what happened in the key moment]\n"
        f"Lesson: [FILL: the lesson from your game review]\n\n"
        + ("Would you have seen it? Comment your rating 👇" if pillar != "journey"
           else "Will I make it to 2000? Follow to find out 👇")
        + f"\n\n{hashtags(clip, fmt)}")
    yt_title = f"Day {day}/{cfg['challenge_days']}: {hook.rstrip('.')} #chess"[:100]
    return "\n".join([
        f"### {when} · {title}",
        "",
        f"- **Source file:** `{clip['name']}`",
        f"- **From the file name:** {facts or 'no result/rating in the name'} · tags: {tags}",
        f"- **Style:** {fmt} ({pillar})",
        f"- **Shorts Smith:** cut 20–40s around the key moment (use your notebook timestamp), 9:16, "
        f"burned-in captions, title card first.",
        f"- **Title card (0–1.5s):** `{card}`",
        f"- **Hook (say it + on screen):** \"{hook}\"",
        "- **Voiceover:**",
        f"  1. \"{hook}\"",
        "  2. \"[FILL: the position, what was at stake]\"",
        "  3. \"[FILL: the move played and why it worked / failed]\"",
        f"  4. \"Day {day}. {rating_text}. {to_go_text} to go.\"",
        "",
        "**Instagram caption:**",
        "```",
        ig_caption,
        "```",
        f"**YouTube Short title:** `{yt_title}`",
        "",
        "**YouTube Short description:**",
        "```",
        f"{hook} Day {day} of the 1500 → 2000 challenge.\nFull week every Sunday → @The2000Project\n"
        f"#chess #shorts #chesscom",
        "```",
        "**Pinned comment:** `What's your rating? I'm reading every comment.`",
        platform_note,
        "",
    ])


def build_plan(clips, cfg, daily=None):
    """Returns ({date: markdown}, schedule_rows, pre_challenge_clips)."""
    total = cfg["challenge_days"]
    pre = [c for c in clips if c["day"] is not None and c["day"] < 1]
    by_day = defaultdict(list)
    for c in clips:
        if c["day"] and c["day"] >= 1:
            by_day[c["day"]].append(c)
    if not by_day:
        return {}, [], pre
    end = day_ratings(clips, cfg["start_rating"], daily)
    start = date.fromisoformat(cfg["start_date"])
    last_day = min(max(by_day) + 1, total + 1)
    pages, schedule, used = {}, [], set()

    for day in range(min(by_day), last_day + 1):
        if day > total and not by_day.get(day - 1):
            continue
        d = start + timedelta(days=day - 1)
        before = rating_before(day, end, cfg["start_rating"])
        after = end.get(day)
        today, yesterday = by_day.get(day, []), by_day.get(day - 1, [])
        rating_now = after if after and today else None
        lines = [f"# Posting plan · Day {day}/{total} · {d:%a %d %b %Y}", ""]
        if day > total:
            lines.append("_Day after the challenge: final result + reveal. See docs/01-brand-and-story.md._\n")
        lines.append(f"Rating at start of day: **{before}**"
                     + (f" · end of day: **{after}** ({after - before:+})" if rating_now else
                        " · end of day: [add your rating to the last file name or daily_log.csv]"))
        lines += ["", "> Every [FILL] needs your real game review. Never post a number that isn't true.", ""]

        def add(time, platform, kind, clip=None, text=""):
            schedule.append({"date": d.isoformat(), "time": time, "platform": platform, "type": kind,
                             "source_file": clip["name"] if clip else "",
                             "hook": hook_for(clip, classify(clip)[0]) if clip else text})

        lines += ["### 09:00 · Instagram Story", "",
                  f"`DAY {day}/{total} · RATING {before}` + \"Today's plan: [FILL]\"", ""]
        add("09:00", "instagram", "story", text=f"DAY {day}/{total} · RATING {before}")

        clip_a = pick(yesterday, {"educational", "entertainment"}, used)
        if clip_a:
            used.add(clip_a["file"])
            lines.append(slot_block("Reel A (lesson/puzzle from yesterday)", "13:00", clip_a, day - 1, cfg,
                                    str(end.get(day - 1, "[RATING]")),
                                    str(max(cfg["target_rating"] - end[day - 1], 0)) if end.get(day - 1)
                                    else "[N]",
                                    "- **YouTube Short:** same clip, uploaded natively at **14:00**."))
            add("13:00", "instagram", "reel A", clip_a)
            add("14:00", "youtube", "short A", clip_a)
        else:
            lines += ["### 13:00 · Reel A", "", "_No recordings from yesterday. Use a training clip "
                      "(notebook calculation drill) or skip._", ""]

        clip_b = pick(today, {"journey", "entertainment"}, used) if today else None
        if clip_b:
            used.add(clip_b["file"])
            r_text = str(after) if rating_now else "[RATING]"
            go_text = str(max(cfg["target_rating"] - after, 0)) if rating_now else "[N]"
            lines.append(slot_block("Reel B (today's update, main post)", "19:30", clip_b, day, cfg, r_text,
                                    go_text, "- **YouTube Short:** same clip, uploaded natively at **20:30**."))
            if rating_now and after - before <= -40:
                lines.append(f"> Alternative hook for Reel B: \"I dropped {before - after} rating today.\"\n")
            elif rating_now and after - before >= 40:
                lines.append(f"> Alternative hook for Reel B: \"+{after - before} today. {go_text} to go.\"\n")
            add("19:30", "instagram", "reel B", clip_b)
            add("20:30", "youtube", "short B", clip_b)
            others = [c for c in today if c is not clip_b]
            if others:
                lines.append("**Other games today (backup clips / Stories):** "
                             + ", ".join(f"`{c['name']}` ({classify(c)[0]})" for c in others) + "\n")
        elif day <= total:
            lines += ["### 19:30 · Reel B", "", "_No recordings for today yet. Re-run after you play._", ""]

        if day <= total:
            poll_rating = after if rating_now else before
            lines += ["### 22:00 · Instagram Story poll", "",
                      f"\"Will I be above {poll_rating} tomorrow?\" Yes / No", ""]
            add("22:00", "instagram", "story poll", text=f"Will I be above {poll_rating} tomorrow?")

        if d.weekday() == 6:
            lines.append(weekly_block(by_day, day, end, cfg))
            add("18:00", "youtube", "long-form", text="weekly video")
            add("18:00", "instagram", "reel (teaser)", text="New video is up: link in bio")
        pages[d] = "\n".join(lines)
    return pages, schedule, pre


def weekly_block(by_day, day, end, cfg):
    days = [x for x in range(max(1, day - 6), day + 1)]
    week_clips = [c for x in days for c in by_day.get(x, [])]
    first = rating_before(days[0], end, cfg["start_rating"])
    known = [x for x in days if x in end]
    last = end[known[-1]] if known else None
    change = (last - first) if last else None
    ranked = sorted(week_clips, key=lambda c: classify(c)[2], reverse=True)[:5]
    good = change is not None and change > 0
    titles = (["I Trained Chess for 7 Days — Here's What Happened",
               f"+{change} in One Week: What Changed" if good else "I Hit a Wall This Week"]
              if day <= 7 else
              [f"I Gained {change} Rating This Week" if good else
               f"I Lost {abs(change)} Rating. Here's Why." if change else "Week " + str((day - 1) // 7 + 1),
               f"Day {day}/30: Can I Still Reach 2000?"])
    out = ["", "## 18:00 · YouTube long-form + teaser Reel (Sunday)", "",
           f"Week rating: {first} → {last if last else '[RATING]'}"
           + (f" ({change:+})" if change is not None else ""), "",
           "**Title options (pick the one that matches the real week):**"]
    out += [f"- {t}" for t in titles]
    out += ["", "**Outline (8–15 min):**",
            "1. Cold open (0:00–0:20): the most dramatic moment of the week"
            + (f": `{ranked[0]['name']}`" if ranked else ""),
            f"2. The stakes: rating, {cfg['challenge_days'] - day} days left, points to go",
            "3. The week in three acts:"]
    out += [f"   - `{c['name']}`: {classify(c)[0]}" for c in ranked]
    out += ["4. The lesson of the week (from the mistake database: `python3 -m tracker mistakes`)",
            "5. The number, and next week's challenge",
            "6. CTA: free training plan in the description",
            "", f"**Thumbnail text:** `{last if last else '[RATING]'}` big + one word (`HELP`, `FINALLY`, `WHY`)",
            "**Teaser Reel 18:00:** best 10s of the cold open + \"Full week is on YouTube, link in bio.\"", ""]
    return "\n".join(out)


def write_plan(pages, schedule, pre, clips, out_dir):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for d, text in pages.items():
        (out_dir / f"{d.isoformat()}.md").write_text(text + "\n", encoding="utf-8")
    with (out_dir / "schedule.csv").open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "time", "platform", "type", "source_file", "hook"])
        writer.writeheader()
        writer.writerows(sorted(schedule, key=lambda r: (r["date"], r["time"])))
    review = ["# File-name check", "",
              "Words the tool did NOT understand are listed here. They are never used in captions. "
              "If one of them is a style you want recognised, rename using the words in "
              "docs/06-channel-launch-kit.md.", ""]
    for c in clips:
        missing = [k for k in ("result", "rating") if not c[k]]
        if c["ignored"] or missing:
            review.append(f"- `{c['name']}`"
                          + (f": ignored {', '.join(c['ignored'])}" if c["ignored"] else "")
                          + (f"; missing {', '.join(missing)}" if missing else ""))
    if pre:
        review += ["", "## Pre-challenge recordings (use for launch Reels and the reveal's 'before' footage)", ""]
        review += [f"- `{c['name']}` ({classify(c)[0]})" for c in pre]
    (out_dir / "_file-name-check.md").write_text("\n".join(review) + "\n", encoding="utf-8")
    return out_dir


def to_game_rows(clips):
    rows = []
    for c in clips:
        if not c["day"] or c["day"] < 1 or not c["result"]:
            continue
        fmt, _, score = classify(c)
        rows.append({"date": c["date"].isoformat(), "day": c["day"], "time_control": c["time_control"] or "",
                     "color": c["color"] or "", "opponent_rating": c["opponent"] or "", "result": c["result"],
                     "rating_after": c["rating"] or "", "accuracy": "", "opening": c["opening"] or "",
                     "mistake_categories": "", "first_uncomfortable_move": "", "key_lesson": "",
                     "content_worthy": "y" if score >= 7 else ""})
    return rows
