"""Chess-side analysis: challenge status, streaks, mistake database, best game."""

from collections import Counter

from .data import MISTAKE_CATEGORIES

PHASES = (
    (1, 7, "DIAGNOSE", "Find where rating is really lost. Analyse every game; don't chase the number."),
    (8, 20, "INTENSIVE CLIMB", "Calculation, tactics, serious games. After a loss: stop, analyse, train the pattern."),
    (21, 27, "PERSONALISE", "Training driven entirely by the mistake database."),
    (28, 10**6, "FINAL PUSH", "Sleep, freshness, strongest time control. No marathons."),
)

STAGES = (
    (0, 1700, 1, "Build the list",
     "Free '1500 → 2000 Training Plan' in bio; prepare the ₹499–₹999 Improvement Pack."),
    (1700, 1850, 2, "Begin coaching",
     "Open a few 1:1 slots (₹1,000–₹2,000/session). Early students at a discount for real, attributed results."),
    (1850, 2000, 3, "Group program",
     "Waitlist for a 4-week '1500 → 1800 Chess Accelerator' cohort. Price example ₹4,999, not a forecast."),
    (2000, 10**6, 4, "Flagship",
     "Course 'The 1500 → 2000 Chess System' (₹7,999–₹14,999); premium coaching only with student proof."),
)

DRILLS = {
    "tactical": "Themed puzzle sets on the exact motifs you missed; untimed, solve fully before moving. "
                "Blunder-check (checks, captures, threats for BOTH sides) before every move.",
    "calculation": "Calculation without moving pieces: write the line in the notebook, then verify. "
                   "Forcing moves first. Push depth from 3 to 5+ ply.",
    "positional": "Annotated master games in your openings' structures; ask 'what does my worst piece want?' "
                  "every few moves.",
    "opening": "Repertoire repair on the exact line that failed: learn the plan and typical tactic, "
               "not more engine moves.",
    "endgame": "Conversion drills from winning positions vs the computer; Lucena/Philidor/K+P basics; "
               "simplify when ahead.",
    "time": "Play longer controls (15|10). Clock checkpoints: at least half your time left at move 20. "
            "Bank time in the opening; use 3-candidate checklist only on critical moves.",
}

MYSTERY_BEATS = {
    1: "\"I won my first state championship before I was 10.\" (blurred trophy)",
    2: "\"I used to be much stronger than I am today.\" (the ~1700 peak)",
    3: "\"I've been hiding something from you.\" (voice, hands, silhouette)",
    4: "\"Tomorrow, you meet the person behind the account.\" (countdown)",
}

YOUTUBE_BY_WEEK = {
    1: "I Have 30 Days to Reach 2000 Chess.com",
    2: "I Trained Chess for 7 Days — Here's What Happened",
    3: "I Played 20 Games Against 1800s / I Tried Everything Chess Coaches Tell 1500s",
    4: "I Finally Reached 1900… (only if true, otherwise title it after the real week)",
    5: "1500 → 2000 in 30 Days — The Final Attempt",
}


def phase(day):
    for start, end, name, focus in PHASES:
        if start <= day <= end:
            return name, focus
    return PHASES[0][2], PHASES[0][3]


def stage(rating):
    for low, high, number, name, action in STAGES:
        if low <= (rating or 0) < high:
            return number, name, action
    return STAGES[0][2:]


def week(day):
    return (day - 1) // 7 + 1


def challenge_status(config, daily, day):
    """Rating status for ``day`` using only logged numbers."""
    by_day = {r["day"]: r for r in daily}
    row = by_day.get(day)
    previous = [r for r in daily if r["day"] < day and r["rating"] is not None]
    prev_rating = previous[-1]["rating"] if previous else config["start_rating"]
    rating = row["rating"] if row and row["rating"] is not None else None
    target = config["target_rating"]
    days_left = max(config["challenge_days"] - day, 0)
    status = {
        "day": day,
        "challenge_days": config["challenge_days"],
        "rating": rating,
        "prev_rating": prev_rating,
        "delta": None if rating is None else rating - prev_rating,
        "from_start": None if rating is None else rating - config["start_rating"],
        "to_go": None if rating is None else max(target - rating, 0),
        "target": target,
        "days_left": days_left,
        "peak": max([r["rating"] for r in daily if r["day"] <= day and r["rating"] is not None]
                    + [config["start_rating"]]),
    }
    if status["to_go"] is not None and days_left:
        status["required_per_day"] = round(status["to_go"] / days_left, 1)
    else:
        status["required_per_day"] = None
    # Average daily gain so far, to compare honestly against the required pace.
    status["pace_so_far"] = round(status["from_start"] / day, 1) if rating is not None and day else None
    return status


def with_rating_changes(games, start_rating):
    """Annotate each game with rating_before / rating_change from the running sequence."""
    running = start_rating
    for g in games:
        g["rating_before"] = running
        g["rating_change"] = None if g["rating_after"] is None else g["rating_after"] - running
        if g["rating_after"] is not None:
            running = g["rating_after"]
    return games


def longest_loss_run(games):
    run = best = 0
    for g in games:
        run = run + 1 if g["result"] == "L" else 0
        best = max(best, run)
    return best


def stop_rule_alerts(day_games, delta):
    alerts = []
    worst_run = longest_loss_run(day_games)
    if worst_run >= 3 or (delta is not None and delta <= -50):
        alerts.append(f"STOP RULE: {worst_run} losses in a row / {delta:+} today. "
                      "Tomorrow starts with analysis + training on the pattern, not games."
                      if delta is not None else
                      f"STOP RULE: {worst_run} losses in a row. Analyse before playing again.")
    elif worst_run == 2:
        alerts.append("Two losses in a row happened today. Keep the 15-min break + analysis rule.")
    unanalysed = [g for g in day_games if g["result"] == "L" and not (g.get("key_lesson") or "").strip()]
    if unanalysed:
        alerts.append(f"{len(unanalysed)} loss(es) without a written lesson. Run the analysis protocol first.")
    return alerts


def mistake_counts(games):
    counts = Counter()
    for g in games:
        counts.update(c for c in g["mistakes"] if c in MISTAKE_CATEGORIES)
    return counts


def unknown_mistake_labels(games):
    return sorted({c for g in games for c in g["mistakes"] if c not in MISTAKE_CATEGORIES})


def top_weakness(games, day, window=7):
    """Most frequent mistake category in the recent window, falling back to all games."""
    recent = mistake_counts([g for g in games if day - window < g["day"] <= day])
    counts = recent or mistake_counts([g for g in games if g["day"] <= day])
    if not counts:
        return None
    return counts.most_common(1)[0][0]


def best_game_for_content(day_games):
    """Pick the day's most content-worthy game and say why."""
    best, best_score, best_why = None, 0.0, []
    for g in day_games:
        score, why = 0.0, []
        if g["content_worthy"]:
            score += 3
            why.append("flagged content-worthy")
        gap = (g["opponent_rating"] or 0) - (g.get("rating_before") or 0)
        if g["result"] == "W" and gap > 0:
            score += gap / 50
            why.append(f"upset win vs +{gap}")
        change = g.get("rating_change")
        if g["result"] == "L" and (g.get("key_lesson") or "").strip():
            score += 1.5
            why.append("loss with a clear lesson")
        if change is not None and abs(change) >= 10:
            score += abs(change) / 10
            why.append(f"{change:+} rating swing")
        if (g["accuracy"] or 0) >= 90:
            score += 1
            why.append(f"{g['accuracy']:.0f}% accuracy")
        if score > best_score:
            best, best_score, best_why = g, score, why
    return best, best_why
