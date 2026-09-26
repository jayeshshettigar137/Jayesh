"""CLI: python3 -m tracker {report,status,mistakes,content,fetch}"""

import argparse

from . import data
from .content import content_report
from .report import build_daily_report, mistakes_report, status_line


def main(argv=None):
    parser = argparse.ArgumentParser(prog="tracker", description="The 2000 Project daily tracker")
    parser.add_argument("--data-dir", default=str(data.REPO_ROOT / "data"),
                        help="folder with daily_log.csv, games.csv, content.csv (default: data/)")
    parser.add_argument("--config", help="path to config.json (default: <data-dir>/config.json, then repo)")
    sub = parser.add_subparsers(dest="command", required=True)

    rep = sub.add_parser("report", help="10-part daily report")
    rep.add_argument("--day", type=int, help="challenge day (default: latest logged)")
    rep.add_argument("--save", action="store_true", help="also write reports/day-XX.md")
    sub.add_parser("status", help="one-line status for bio/Stories")
    sub.add_parser("mistakes", help="recurring-mistake database")
    sub.add_parser("content", help="content analytics + winner variations")
    fetch = sub.add_parser("fetch", help="import games from Chess.com (needs CHESSCOM_USERNAME)")
    fetch.add_argument("--month", required=True, help="YYYY-MM")
    fetch.add_argument("--all-pools", action="store_true", help="include all time classes, not just the pool")

    args = parser.parse_args(argv)
    config = data.load_config(args.data_dir, args.config)
    daily = data.load_daily(args.data_dir)
    games = data.load_games(args.data_dir)

    if args.command == "report":
        text = build_daily_report(config, daily, games, data.load_content(args.data_dir), args.day)
        print(text)
        if args.save:
            day = args.day or (daily[-1]["day"] if daily else 0)
            out = data.REPO_ROOT / "reports" / f"day-{day:02d}.md"
            out.parent.mkdir(exist_ok=True)
            out.write_text(text + "\n", encoding="utf-8")
            print(f"\nSaved {out.relative_to(data.REPO_ROOT)}")
    elif args.command == "status":
        print(status_line(config, daily))
    elif args.command == "mistakes":
        print(mistakes_report(games, config))
    elif args.command == "content":
        print(content_report(data.load_content(args.data_dir), config["pillar_targets"]))
    elif args.command == "fetch":
        from .fetch import run
        print(run(config, args.data_dir, args.month, args.all_pools))


if __name__ == "__main__":
    main()
