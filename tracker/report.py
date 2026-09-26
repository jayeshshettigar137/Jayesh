"""The 10-part daily report."""

from . import analysis as A
from .content import enrich, pillar_mix, rank_by, variations_for_winners


def _fmt(value, suffix=""):
    return "n/a" if value is None else f"{value}{suffix}"


def _signed(value):
    return "n/a" if value is None else f"{value:+}"


def hooks_from_data(status, best_game):
    """Hooks built only from real numbers of the day."""
    hooks = []
    delta, to_go, rating = status["delta"], status["to_go"], status["rating"]
    if rating is None:
        return hooks
    if delta is not None and delta <= -40:
        hooks.append(f"I dropped {abs(delta)} rating today.")
    if delta is not None and delta >= 40:
        hooks.append(f"+{delta} today. {to_go} to go.")
    if to_go == 0:
        hooks.append(f"{rating}. I did it.")
    elif to_go <= 150:
        hooks.append(f"I need {to_go} more points.")
    if best_game:
        change = best_game.get("rating_change")
        if best_game["result"] == "L" and change:
            hooks.append(f"This mistake cost me {abs(change)} rating.")
            hooks.append("I thought this position was winning…")
        if best_game["result"] == "W" and (best_game["opponent_rating"] or 0) > (best_game["rating_before"] or 0):
            hooks.append(f"I'm {best_game['rating_before']}. I just beat a {best_game['opponent_rating']}.")
    hooks.append(f"Day {status['day']}/{status['challenge_days']}. {rating}. {to_go} to go.")
    return hooks


def cta_for(status, daily_row):
    rating, day = status["rating"] or 0, status["day"]
    if day <= 3:
        return "Follow to see if I make it. Comment your rating."
    if rating >= 1700 and day >= 14:
        return "The Improvement Pack waitlist is in bio. Everything I'm using, organised."
    return "My full 1500 → 2000 training plan is free. Link in bio."


def build_daily_report(config, daily, games, content, day=None):
    if not daily:
        return ("# Daily report\n\n_No days logged yet. Add a row to `data/daily_log.csv` "
                "(and games to `data/games.csv`), then run again._")
    day = day or daily[-1]["day"]
    row = next((r for r in daily if r["day"] == day), None)
    status = A.challenge_status(config, daily, day)
    A.with_rating_changes(games, config["start_rating"])
    day_games = [g for g in games if g["day"] == day]
    games_to_date = [g for g in games if g["day"] <= day]
    phase_name, phase_focus = A.phase(day)
    weakness = A.top_weakness(games, day)
    best, why = A.best_game_for_content(day_games)
    posts = enrich([c for c in content if (c.get("day") or 0) <= day])
    stage_no, stage_name, stage_action = A.stage(status["rating"])

    out = [f"# Day {day}/{config['challenge_days']}: {config['challenge_name']}", ""]
    out.append("```")
    out.append(f"DAY {day}/{config['challenge_days']}   RATING: {_fmt(status['rating'])}   "
               f"TARGET: {status['target']}")
    out.append("```")
    out.append(f"Phase: **{phase_name}**. {phase_focus}")
    if row is None:
        out += ["", f"_No daily_log row for day {day}. Report is based on games only._"]

    alerts = A.stop_rule_alerts(day_games, status["delta"])
    unknown = A.unknown_mistake_labels(games_to_date)
    if unknown:
        alerts.append(f"Unknown mistake labels in games.csv: {', '.join(unknown)} "
                      "(use tactical/calculation/positional/opening/endgame/time).")
    if alerts:
        out += [""] + [f"> ⚠️ {a}" for a in alerts]

    # 1. Chess performance
    out += ["", "## 1. Chess performance", ""]
    out.append(f"- Rating **{_fmt(status['rating'])}** ({_signed(status['delta'])} today, "
               f"{_signed(status['from_start'])} since start). Peak so far {status['peak']}.")
    if status["rating"] is not None:
        if status["to_go"] == 0:
            out.append(f"- **Target reached.** {status['rating']} ≥ {status['target']}.")
        else:
            out.append(f"- {status['to_go']} to go, {status['days_left']} days left → needs "
                       f"**{_fmt(status['required_per_day'])}/day** (pace so far "
                       f"{_fmt(status['pace_so_far'])}/day).")
            if status["required_per_day"] and status["required_per_day"] > 40:
                out.append("- Honest read: 2000 now needs an unusually steep pace. Keep documenting; "
                           "reframe publicly if it becomes unrealistic. Never fake it.")
    w = sum(g["result"] == "W" for g in day_games)
    l = sum(g["result"] == "L" for g in day_games)
    d = sum(g["result"] == "D" for g in day_games)
    if day_games:
        accs = [g["accuracy"] for g in day_games if g["accuracy"] is not None]
        opp = [g["opponent_rating"] for g in day_games if g["opponent_rating"] is not None]
        out.append(f"- Games: {len(day_games)} (W{w} L{l} D{d}), score {(w + d / 2) / len(day_games):.0%}"
                   + (f", avg accuracy {sum(accs) / len(accs):.1f}%" if accs else "")
                   + (f", avg opponent {round(sum(opp) / len(opp))}" if opp else "") + ".")
        today = A.mistake_counts(day_games)
        if today:
            out.append("- Mistakes today: " + ", ".join(f"{k} ×{v}" for k, v in today.most_common()))
    elif row and row.get("games"):
        out.append(f"- Games (from daily log): {row['games']} (W{row['wins']} L{row['losses']} D{row['draws']}).")
    else:
        out.append("- No games logged for this day.")
    if row:
        extras = [f"{label} {_fmt(row.get(key), unit)}" for label, key, unit in
                  (("training", "training_hours", "h"), ("tactics", "tactics_score", "%"),
                   ("calculation", "calc_score", "%"), ("endgame", "endgame_score", "%"))
                  if row.get(key) is not None]
        if extras:
            out.append("- Training: " + ", ".join(extras) + ".")
    total = A.mistake_counts(games_to_date)
    if total:
        out.append("- Mistake database to date: " + ", ".join(f"{k} {v}" for k, v in total.most_common()))

    # 2. Training recommendation
    out += ["", "## 2. Training recommendation", ""]
    if weakness:
        out.append(f"- Biggest recurring weakness (last 7 days): **{weakness}**. {A.DRILLS[weakness]}")
    else:
        out.append("- Not enough tagged mistakes yet. Tag `mistake_categories` on every serious game.")
    if day <= 7:
        out.append("- Diagnosis phase: 2–3 serious rapid games/day, all fully analysed. "
                   "Build the repertoire in `templates/repertoire.md`.")
    if l > w and day_games:
        out.append("- More losses than wins today: play fewer games tomorrow and analyse more.")

    # 3. Content recommendation
    out += ["", "## 3. Content recommendation", ""]
    recent_content = [c for c in content if day - 7 < (c.get("day") or 0) <= day]
    mix = pillar_mix(recent_content, config["pillar_targets"])
    if recent_content:
        under = max(mix, key=lambda p: p["gap"])
        out.append(f"- Last 7 days pillar mix: " + ", ".join(f"{p['pillar']} {p['actual']:.0%}" for p in mix)
                   + f". Most under target: **{under['pillar']}** ({under['target']:.0%} target).")
    else:
        out.append("- No content logged in the last 7 days. Journey update first (40% pillar).")
    if posts:
        fmt = rank_by(posts, "format")[0]
        out.append(f"- Best format so far: **{fmt['label']}** (score {fmt['score']}, {fmt['posts']} posts). "
                   "Keep ~70% proven formats, ~30% experiments.")

    # 4. Best game for content
    out += ["", "## 4. Best game for content", ""]
    if best:
        out.append(f"- {best['result']} as {best.get('color') or '?'} vs {_fmt(best['opponent_rating'])} "
                   f"({best.get('opening') or 'opening n/a'}), rating change {_signed(best.get('rating_change'))}. "
                   f"Why: {', '.join(why)}.")
        if (best.get("key_lesson") or "").strip():
            out.append(f"- Lesson: {best['key_lesson']}")
    else:
        out.append("- Nothing stood out. Use the rating update + a training clip.")

    # 5. Best hook
    out += ["", "## 5. Best hook", ""]
    hooks = hooks_from_data(status, best)
    if hooks:
        out.append(f"- **\"{hooks[0]}\"**")
        out += [f"- Alt: \"{h}\"" for h in hooks[1:4]]
    if posts:
        top = rank_by(posts, "hook")[0]
        out.append(f"- Best-performing hook so far: \"{top['label']}\" (score {top['score']}).")

    # 6. Reel idea
    out += ["", "## 6. Reel idea", ""]
    card = f"DAY {day}/{config['challenge_days']} · RATING {_fmt(status['rating'])} · TARGET {status['target']}"
    if best and best["result"] == "L":
        out.append(f"- Mistake breakdown (20–30s): {card} → hook → the position before the mistake → "
                   "'what would you play?' pause → the move played → the refutation → one-sentence lesson.")
    elif best and best["result"] == "W":
        out.append(f"- Highlight (15–30s): {card} → hook → the key moment with arrows + eval bar → result → "
                   f"'{status['to_go']} to go.'")
    else:
        out.append(f"- Training clip: {card} → notebook calculation drill → the answer → today's number.")
    out.append("- Also: turn the critical position into a 'Can you find the move?' puzzle Reel.")

    # 7. YouTube idea
    out += ["", "## 7. YouTube idea", ""]
    yt = A.YOUTUBE_BY_WEEK[min(day // 7 + 1, 5)]
    out.append(f"- Next long-form: **\"{yt}\"**. Retitle to match what really happened this week.")
    out.append(f"- Mystery beat this week: {A.MYSTERY_BEATS[min(A.week(day), 4)]}")

    # 8. CTA
    out += ["", "## 8. CTA", "", f"- {cta_for(status, row)}"]

    # 9. Monetization
    out += ["", "## 9. Monetization opportunity", ""]
    out.append(f"- Stage {stage_no} ({stage_name}), based on current rating {_fmt(status['rating'])}: {stage_action}")
    subs = sum(r.get("email_subscribers") or 0 for r in daily if r["day"] <= day)
    sales = sum(r.get("product_sales") or 0 for r in daily if r["day"] <= day)
    out.append(f"- Email subscribers gained to date: {subs}. Product sales to date: {sales}.")
    if subs < 100:
        out.append("- Priority is the free plan and email capture, not selling.")

    # 10. Next-day plan
    out += ["", "## 10. Next-day plan", ""]
    stop = any(a.startswith("STOP RULE") for a in alerts)
    tactics_focus = f" (focus: {weakness})" if weakness else ""
    plan = [
        f"Tactics 60m{tactics_focus}",
        "Calculation without moving pieces 45m",
        "Openings 45m" + (" (repair the line that failed)" if weakness == "opening" else ""),
        "Endgames 30m" + (" (conversion)" if weakness == "endgame" else ""),
        "Serious games " + ("45–60m max, only after analysis (stop rule)" if stop else
                            "60–90m, strongest time control" if phase_name == "FINAL PUSH" else "90–120m")
        + (", longer control (15|10)" if weakness == "time" else ""),
        "Analysis 60m" + (" + review today's losses first" if l else ""),
        "Content 60–90m",
    ]
    out += [f"{i}. {p}" for i, p in enumerate(plan, 1)]
    if phase_name == "FINAL PUSH":
        out.append("- Final push: sleep ≥ 7.5h, 20m tactics warm-up, record every game.")
    ideas = variations_for_winners(posts, n_hooks=1, n_topics=1)
    if ideas:
        out.append(f"- Content to make tomorrow (winner variation): \"{ideas[0][1]}\"")
    return "\n".join(out)


def status_line(config, daily):
    if not daily:
        return f"Day 0/{config['challenge_days']} · {config['start_rating']} → {config['target_rating']}"
    s = A.challenge_status(config, daily, daily[-1]["day"])
    return (f"DAY {s['day']}/{s['challenge_days']} · RATING {_fmt(s['rating'])} ({_signed(s['delta'])}) · "
            f"TARGET {s['target']} · {_fmt(s['to_go'])} to go")


def mistakes_report(games, config):
    A.with_rating_changes(games, config["start_rating"])
    counts = A.mistake_counts(games)
    lines = ["# Mistake database", ""]
    if not counts:
        return "\n".join(lines + ["_No tagged mistakes yet._"])
    top = max(counts.values())
    lines.append("```")
    for cat, n in counts.most_common():
        lines.append(f"{cat:<12} {n:>4}  {'█' * max(1, round(18 * n / top))}")
    lines.append("```")
    lines += ["", "## Rating lost in games with each mistake", "", "| category | games | rating lost |",
              "|---|---|---|"]
    for cat, _ in counts.most_common():
        tagged = [g for g in games if cat in g["mistakes"]]
        lost = -sum(g["rating_change"] for g in tagged if (g.get("rating_change") or 0) < 0)
        lines.append(f"| {cat} | {len(tagged)} | {lost} |")
    lines += ["", "## By week", "", "| week | " + " | ".join(c for c, _ in counts.most_common()) + " |",
              "|---" * (len(counts) + 1) + "|"]
    for wk in sorted({A.week(g["day"]) for g in games}):
        wc = A.mistake_counts([g for g in games if A.week(g["day"]) == wk])
        lines.append(f"| {wk} | " + " | ".join(str(wc.get(c, 0)) for c, _ in counts.most_common()) + " |")
    first = counts.most_common(1)[0][0]
    lines += ["", f"**Train first:** {first}. {A.DRILLS[first]}"]
    return "\n".join(lines)
