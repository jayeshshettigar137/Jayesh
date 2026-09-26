"""Content analytics: find winning hooks/topics/formats and spin variations."""

import re
from collections import defaultdict
from statistics import mean, median

from .data import PILLARS

WEIGHTS = {"views": 0.35, "completion_pct": 0.25, "share_rate": 0.15, "save_rate": 0.10, "follow_rate": 0.15}
RATING_LADDER = (1500, 1600, 1700, 1800, 1900, 2000)


def length_bucket(seconds):
    if seconds is None:
        return "unknown"
    for limit, label in ((15, "<15s"), (30, "15–30s"), (45, "30–45s"), (60, "45–60s"), (180, "1–3 min")):
        if seconds < limit:
            return label
    return "3 min+"


def _rate(row, key):
    views = row.get("views") or 0
    return (row.get(key) or 0) / views if views else 0.0


def enrich(rows):
    """Add per-post rates and a composite score relative to the account's medians (1.0 = median)."""
    posts = [r for r in rows if r.get("views")]
    for r in posts:
        r["share_rate"] = _rate(r, "shares")
        r["save_rate"] = _rate(r, "saves")
        r["follow_rate"] = _rate(r, "followers_gained")
        r["length_bucket"] = length_bucket(r.get("length_s"))
    medians = {k: median([r.get(k) or 0 for r in posts]) if posts else 0 for k in WEIGHTS}
    for r in posts:
        score = 0.0
        for key, weight in WEIGHTS.items():
            value, mid = r.get(key) or 0, medians[key]
            ratio = value / mid if mid else (2.0 if value else 1.0)
            score += weight * min(ratio, 10.0)  # cap so one viral outlier can't dominate everything
        r["score"] = round(score, 2)
    return posts


def rank_by(posts, key, min_posts=1):
    groups = defaultdict(list)
    for r in posts:
        groups[str(r.get(key) or "").strip() or "(blank)"].append(r)
    ranked = [
        {
            "label": label,
            "posts": len(items),
            "score": round(mean(i["score"] for i in items), 2),
            "avg_views": round(mean(i["views"] for i in items)),
            "avg_completion": round(mean(i.get("completion_pct") or 0 for i in items), 1),
        }
        for label, items in groups.items()
        if len(items) >= min_posts
    ]
    return sorted(ranked, key=lambda g: (g["score"], g["avg_views"]), reverse=True)


def retire_candidates(posts, key="format", min_posts=5):
    """Formats with enough posts that still average below the account median (score < 1)."""
    return [g for g in rank_by(posts, key, min_posts) if g["score"] < 1.0]


def pillar_mix(rows, targets):
    counts = defaultdict(int)
    for r in rows:
        if r.get("pillar") in PILLARS:
            counts[r["pillar"]] += 1
    total = sum(counts.values())
    mix = []
    for pillar in PILLARS:
        actual = counts[pillar] / total if total else 0.0
        mix.append({"pillar": pillar, "count": counts[pillar], "actual": actual,
                    "target": targets.get(pillar, 0.0), "gap": targets.get(pillar, 0.0) - actual})
    return mix


def ladder_variations(hook):
    """'Why 1500s keep blundering queens' → same hook at the other rating levels."""
    match = re.search(r"\b(1[5-9]00|2000)(s?)\b", hook)
    if not match:
        return []
    current = int(match.group(1))
    return [hook[:match.start()] + f"{level}{match.group(2)}" + hook[match.end():]
            for level in RATING_LADDER if level != current][:3]


def topic_variations(topic):
    t = topic.strip().rstrip(".").lower()
    return [
        f"3 things about {t} every 1500 should know",
        f"I fixed my {t} problem. Here's how.",
        f"Can you spot the {t} idea?",
        f"{t.capitalize()}: what I got wrong at 1500",
    ]


def variations_for_winners(posts, n_hooks=2, n_topics=2):
    ideas = []
    for g in rank_by(posts, "hook")[:n_hooks]:
        for v in ladder_variations(g["label"]):
            ideas.append((g["label"], v))
    for g in rank_by(posts, "topic")[:n_topics]:
        if g["label"] != "(blank)":
            for v in topic_variations(g["label"]):
                ideas.append((g["label"], v))
    seen, unique = set(), []
    for source, idea in ideas:
        if idea.lower() not in seen:
            seen.add(idea.lower())
            unique.append((source, idea))
    return unique


def content_report(rows, targets):
    posts = enrich(rows)
    lines = ["# Content analytics", ""]
    if not posts:
        lines.append("_No content with views logged yet. Add rows to `data/content.csv`._")
        return "\n".join(lines)
    lines.append(f"{len(posts)} posts analysed. Score 1.0 = account median "
                 "(views 35%, completion 25%, share rate 15%, save rate 10%, follow rate 15%).")
    for title, key in (("Best hooks", "hook"), ("Best topics", "topic"), ("Best formats", "format"),
                       ("Best lengths", "length_bucket"), ("Best CTAs", "cta"), ("By pillar", "pillar"),
                       ("By platform", "platform")):
        lines += ["", f"## {title}", "", "| # | " + key + " | posts | score | avg views | avg completion |",
                  "|---|---|---|---|---|---|"]
        for i, g in enumerate(rank_by(posts, key)[:5], 1):
            lines.append(f"| {i} | {g['label']} | {g['posts']} | {g['score']} | {g['avg_views']:,} | "
                         f"{g['avg_completion']}% |")
    lines += ["", "## Pillar mix vs target", "", "| pillar | posts | actual | target |", "|---|---|---|---|"]
    for p in pillar_mix(rows, targets):
        lines.append(f"| {p['pillar']} | {p['count']} | {p['actual']:.0%} | {p['target']:.0%} |")
    retire = retire_candidates(posts)
    lines += ["", "## Retire or rework (≥5 posts, below median)", ""]
    lines += [f"- {g['label']} (score {g['score']}, {g['posts']} posts)" for g in retire] or ["- None yet."]
    lines += ["", "## Make next: variations of the winners", ""]
    lines += [f"- {idea}  _(from: {source})_" for source, idea in variations_for_winners(posts)] \
        or ["- Not enough data yet."]
    return "\n".join(lines)
