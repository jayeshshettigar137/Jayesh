import csv
import os
import re
from datetime import date
from typing import Dict, List

from .claims import Claim

FIELDS = ["id", "speaker", "source_url", "said_on", "quote", "subject", "asset", "direction",
          "target", "deadline", "confidence", "verified", "sample"]


def _f(v):
    v = (v or "").strip()
    return float(v) if v else None


def load_claims(path: str) -> List[Claim]:
    out = []
    if not os.path.exists(path):
        return out
    with open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if (r.get("verified") or "").strip().lower() != "yes":
                continue  # never publish a claim a human has not checked
            if not re.fullmatch(r"[A-Za-z0-9_-]+", r["id"].strip()):
                raise ValueError(f"unsafe claim id: {r['id']!r}")
            if not r["source_url"].strip().startswith(("http://", "https://")):
                raise ValueError(f"source_url must be http(s): {r['source_url']!r}")
            c = Claim(r["speaker"].strip(), r["source_url"].strip(),
                      date.fromisoformat(r["said_on"]), r["quote"].strip(),
                      subject=r["subject"].strip(), direction=r["direction"].strip(),
                      target=_f(r["target"]), deadline=date.fromisoformat(r["deadline"]),
                      confidence=_f(r.get("confidence")))
            c.id = r["id"].strip()
            c.asset = r["asset"].strip()
            c.sample = (r.get("sample") or "").strip().lower() == "yes"
            out.append(c)
    return out


def load_prices(folder: str) -> Dict[str, Dict[date, float]]:
    prices = {}
    if not os.path.isdir(folder):
        return prices
    for name in os.listdir(folder):
        if not name.endswith(".csv"):
            continue
        series = {}
        with open(os.path.join(folder, name), newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                series[date.fromisoformat(r["date"])] = float(r["close"])
        prices[name[:-4].upper()] = series
    return prices
