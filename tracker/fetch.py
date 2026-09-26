"""Optional: import games from the Chess.com public API into data/games.csv.

The username comes from the CHESSCOM_USERNAME environment variable so it never
lands in the repository. Usernames, game URLs and PGNs are deliberately NOT
stored: they would de-anonymise the account.
"""

import csv
import json
import os
import re
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

API = "https://api.chess.com/pub/player/{user}/games/{year}/{month:02d}"
GAME_FIELDS = ["date", "day", "time_control", "color", "opponent_rating", "result", "rating_after",
               "accuracy", "opening", "mistake_categories", "first_uncomfortable_move", "key_lesson",
               "content_worthy"]
DRAWS = {"agreed", "repetition", "stalemate", "insufficient", "50move", "timevsinsufficient"}


def fetch_month(username, year, month):
    req = urllib.request.Request(API.format(user=username.lower(), year=year, month=month),
                                 headers={"User-Agent": "the-2000-project-tracker"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp).get("games", [])


def _opening(game):
    match = re.search(r'\[ECOUrl "[^"]*/openings/([^"]+)"\]', game.get("pgn", ""))
    return match.group(1).replace("-", " ").split("...")[0].strip() if match else ""


def to_rows(api_games, username, start_date, rating_pool):
    """Convert API games to games.csv rows (sorted by end time), keeping only the chosen pool."""
    username = username.lower()
    start = date.fromisoformat(start_date)
    rows = []
    for g in sorted(api_games, key=lambda g: g.get("end_time", 0)):
        if g.get("rules", "chess") != "chess" or (rating_pool and g.get("time_class") != rating_pool):
            continue
        me_color = "white" if g["white"]["username"].lower() == username else "black"
        if g[me_color]["username"].lower() != username:
            continue
        me, opp = g[me_color], g["black" if me_color == "white" else "white"]
        result = "W" if me["result"] == "win" else "D" if me["result"] in DRAWS else "L"
        played = datetime.fromtimestamp(g["end_time"], tz=timezone.utc).date()
        accuracy = (g.get("accuracies") or {}).get(me_color)
        rows.append({
            "date": played.isoformat(),
            "day": (played - start).days + 1,
            "time_control": g.get("time_control", ""),
            "color": me_color,
            "opponent_rating": opp.get("rating", ""),
            "result": result,
            "rating_after": me.get("rating", ""),
            "accuracy": "" if accuracy is None else round(accuracy, 1),
            "opening": _opening(g),
            "mistake_categories": "", "first_uncomfortable_move": "", "key_lesson": "",
            "content_worthy": "",
        })
    return [r for r in rows if r["day"] >= 1]


def _key(row):
    return (str(row["date"]), str(row["color"]), str(row["opponent_rating"]), str(row["rating_after"]),
            str(row["result"]).upper()[:1])


def append_new(rows, games_csv):
    """Append rows not already present; returns how many were added."""
    games_csv = Path(games_csv)
    existing = set()
    if games_csv.exists():
        with games_csv.open(newline="", encoding="utf-8") as f:
            existing = {_key(r) for r in csv.DictReader(f)}
    new = [r for r in rows if _key(r) not in existing]
    write_header = not games_csv.exists() or games_csv.stat().st_size == 0
    with games_csv.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=GAME_FIELDS)
        if write_header:
            writer.writeheader()
        writer.writerows(new)
    return len(new)


def run(config, data_dir, month, all_pools=False):
    username = os.environ.get("CHESSCOM_USERNAME")
    if not username:
        raise SystemExit("Set CHESSCOM_USERNAME in your environment (never commit it).")
    year, mon = (int(x) for x in month.split("-"))
    api_games = fetch_month(username, year, mon)
    rows = to_rows(api_games, username, config["start_date"], None if all_pools else config["rating_pool"])
    added = append_new(rows, Path(data_dir) / "games.csv")
    return (f"Added {added} new game(s) to games.csv. Now fill in mistake_categories, "
            "first_uncomfortable_move and key_lesson using templates/game-review.md.")
