import argparse
import sys
from datetime import date

from .extract import extract


def main(argv=None):
    p = argparse.ArgumentParser(prog="receipts")
    sub = p.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("extract", help="extract scorable predictions from a transcript file")
    e.add_argument("transcript")
    e.add_argument("--speaker", required=True)
    e.add_argument("--url", required=True)
    e.add_argument("--said-on", required=True, help="YYYY-MM-DD")
    b = sub.add_parser("build", help="build the static site")
    b.add_argument("--data", default="data/receipts")
    b.add_argument("--out", default="site")
    b.add_argument("--png", action="store_true", help="also render PNG share cards (needs Chromium)")
    a = p.parse_args(argv)
    if a.cmd == "build":
        from .build import build, load_cfg
        print(build(a.data, a.out, load_cfg("site.json"), png=a.png))
        return 0
    text = open(a.transcript, encoding="utf-8").read()
    for c in extract(text, a.speaker, a.url, date.fromisoformat(a.said_on)):
        print(f"{c.speaker} | {c.subject} {c.direction} {c.target:g} by {c.deadline} | {c.text}")


if __name__ == "__main__":
    sys.exit(main())
