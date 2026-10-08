"""Generates FICTIONAL demo data (fake speakers, fake assets, synthetic prices).
Everything it writes is flagged sample=yes. Never mix this with real data."""
import csv
import os
import random
from datetime import date, timedelta

from .data import FIELDS


def make(folder="data/sample", seed=7):
    rnd = random.Random(seed)
    os.makedirs(os.path.join(folder, "prices"), exist_ok=True)
    start, end = date(2025, 1, 1), date(2026, 9, 30)
    series = {}
    for asset, p0 in (("SMPL1", 100.0), ("SMPL2", 40.0)):
        p, d, rows = p0, start, []
        while d <= end:
            p = max(1.0, p * (1 + rnd.gauss(0.0006, 0.03)))
            rows.append((d, round(p, 2)))
            d += timedelta(days=1)
        series[asset] = dict(rows)
        with open(os.path.join(folder, "prices", f"{asset}.csv"), "w", newline="") as fh:
            w = csv.writer(fh); w.writerow(["date", "close"]); w.writerows(rows)
    speakers = {"Sample Pundit A": (12, 1.25), "Sample Pundit B": (11, 1.9), "Sample Pundit C": (4, 1.4)}
    out, n = [], 1
    for sp, (count, stretch) in speakers.items():
        for _ in range(count):
            asset = rnd.choice(["SMPL1", "SMPL2"])
            said = date(2025, 2, 1) + timedelta(days=rnd.randint(0, 330))
            deadline = said + timedelta(days=rnd.choice([90, 150, 240, 400]))
            base = series[asset].get(said, 100.0)
            target = round(base * (stretch + rnd.random() * 0.3), 0)
            quote = f"{asset} will hit ${target:,.0f} by {deadline.strftime('%B %Y')}."
            out.append({"id": f"r{n:03d}", "speaker": sp, "source_url": "https://example.com/sample",
                        "said_on": said.isoformat(), "quote": quote, "subject": asset, "asset": asset,
                        "direction": "above", "target": f"{target:g}",
                        "deadline": deadline.isoformat(), "confidence": "", "verified": "yes", "sample": "yes"})
            n += 1
    with open(os.path.join(folder, "claims.csv"), "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS); w.writeheader(); w.writerows(out)


if __name__ == "__main__":
    make()
