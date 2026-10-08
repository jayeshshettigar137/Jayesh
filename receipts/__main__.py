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
    a = p.parse_args(argv)
    text = open(a.transcript, encoding="utf-8").read()
    for c in extract(text, a.speaker, a.url, date.fromisoformat(a.said_on)):
        print(f"{c.speaker} | {c.subject} {c.direction} {c.target:g} by {c.deadline} | {c.text}")


if __name__ == "__main__":
    sys.exit(main())
