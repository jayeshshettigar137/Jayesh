"""Loading config and the three tracking CSVs."""

import csv
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

MISTAKE_CATEGORIES = ("tactical", "calculation", "positional", "opening", "endgame", "time")
PILLARS = ("journey", "educational", "entertainment", "personality", "product")

DAILY_INT = ("day", "rating", "peak_rating", "games", "wins", "losses", "draws",
             "followers_gained", "email_subscribers", "product_sales")
DAILY_FLOAT = ("avg_accuracy", "training_hours", "tactics_score", "calc_score", "endgame_score")
GAME_INT = ("day", "opponent_rating", "rating_after")
GAME_FLOAT = ("accuracy",)
CONTENT_INT = ("day", "views", "likes", "comments", "shares", "saves", "profile_visits",
               "followers_gained", "conversions")
CONTENT_FLOAT = ("length_s", "avg_watch_s", "completion_pct")


def to_num(value, cast=float):
    """Parse a CSV cell; blank or unparseable cells become None."""
    if value is None:
        return None
    value = str(value).strip().replace(",", "").rstrip("%")
    if value == "":
        return None
    try:
        return cast(float(value)) if cast is int else cast(value)
    except ValueError:
        return None


def read_csv(path):
    path = Path(path)
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        return [row for row in csv.DictReader(f) if any((v or "").strip() for v in row.values())]


def _coerce(rows, ints, floats):
    for row in rows:
        for key in ints:
            row[key] = to_num(row.get(key), int)
        for key in floats:
            row[key] = to_num(row.get(key), float)
    return rows


def load_config(data_dir=None, path=None):
    """Config lookup: explicit path, then <data_dir>/config.json, then repo config.json."""
    candidates = [path] if path else []
    if data_dir:
        candidates.append(Path(data_dir) / "config.json")
    candidates.append(REPO_ROOT / "config.json")
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            with Path(candidate).open(encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError("config.json not found")


def load_daily(data_dir):
    rows = _coerce(read_csv(Path(data_dir) / "daily_log.csv"), DAILY_INT, DAILY_FLOAT)
    rows = [r for r in rows if r["day"] is not None]
    return sorted(rows, key=lambda r: r["day"])


def load_games(data_dir):
    """Games in file order (file order = play order), with parsed mistake categories."""
    rows = _coerce(read_csv(Path(data_dir) / "games.csv"), GAME_INT, GAME_FLOAT)
    for row in rows:
        row["result"] = (row.get("result") or "").strip().upper()[:1]
        cats = (row.get("mistake_categories") or "").replace(",", ";").split(";")
        row["mistakes"] = [c.strip().lower() for c in cats if c.strip()]
        row["content_worthy"] = (row.get("content_worthy") or "").strip().lower() in ("y", "yes", "1", "true")
    return [r for r in rows if r["day"] is not None]


def load_content(data_dir):
    rows = _coerce(read_csv(Path(data_dir) / "content.csv"), CONTENT_INT, CONTENT_FLOAT)
    for row in rows:
        row["pillar"] = (row.get("pillar") or "").strip().lower()
    return rows
