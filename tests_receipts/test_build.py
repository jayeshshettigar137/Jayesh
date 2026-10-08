import csv
import os
import tempfile
import unittest

from receipts.build import build, DEFAULT_CFG
from receipts.data import FIELDS, load_claims


def write_data(folder, claims, prices):
    os.makedirs(os.path.join(folder, "prices"))
    with open(os.path.join(folder, "claims.csv"), "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS); w.writeheader(); w.writerows(claims)
    with open(os.path.join(folder, "prices", "BTC.csv"), "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["date", "close"]); w.writerows(prices)


def claim(**kw):
    base = {"id": "r1", "speaker": "A", "source_url": "https://example.com/v", "said_on": "2026-01-01",
            "quote": "BTC will hit $200 by June 2026.", "subject": "BTC", "asset": "BTC", "direction": "above",
            "target": "200", "deadline": "2026-06-30", "confidence": "", "verified": "yes", "sample": ""}
    base.update(kw)
    return base


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.data, self.out = os.path.join(self.tmp, "d"), os.path.join(self.tmp, "o")

    def read(self, rel):
        with open(os.path.join(self.out, rel), encoding="utf-8") as fh:
            return fh.read()

    def test_empty_data_builds_clean_home(self):
        write_data(self.data, [], [("2026-02-01", 100)])
        info = build(self.data, self.out, DEFAULT_CFG)
        self.assertEqual(info["claims"], 0)
        self.assertIn("No receipts published yet", self.read("index.html"))

    def test_unverified_claims_never_published(self):
        write_data(self.data, [claim(verified="no")], [("2026-02-01", 100)])
        self.assertEqual(build(self.data, self.out, DEFAULT_CFG)["claims"], 0)

    def test_html_is_escaped(self):
        evil = "<script>alert(1)</script>"
        write_data(self.data, [claim(quote=evil, speaker=evil)], [("2026-02-01", 100)])
        build(self.data, self.out, DEFAULT_CFG)
        for f in ("c/r1.html", "c/r1.svg", "index.html"):
            self.assertNotIn("<script>alert", self.read(f), f)

    def test_rejects_unsafe_url_and_id(self):
        write_data(self.data, [claim(source_url="javascript:alert(1)")], [("2026-02-01", 100)])
        with self.assertRaises(ValueError):
            load_claims(os.path.join(self.data, "claims.csv"))
        os.remove(os.path.join(self.data, "claims.csv"))
        with open(os.path.join(self.data, "claims.csv"), "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=FIELDS); w.writeheader(); w.writerow(claim(id="../x"))
        with self.assertRaises(ValueError):
            load_claims(os.path.join(self.data, "claims.csv"))

    def test_right_wrong_and_ranking_threshold(self):
        prices = [("2026-02-01", 100), ("2026-03-01", 250), ("2026-09-01", 120)]
        write_data(self.data, [claim(id="a", target="200"), claim(id="b", target="900")], prices)
        info = build(self.data, self.out, DEFAULT_CFG)
        self.assertIn("RIGHT", self.read("c/a.html"))
        self.assertIn("WRONG", self.read("c/b.html"))
        self.assertEqual(info["ranked"], 0)  # only 2 resolved claims: nobody ranked
        self.assertIn("not ranked", self.read("s/a.html"))

    def test_missing_prices_is_unscorable_not_wrong(self):
        write_data(self.data, [claim(asset="ETH", id="e")], [("2026-02-01", 100)])
        build(self.data, self.out, DEFAULT_CFG)
        self.assertIn("UNSCORABLE", self.read("c/e.html"))


if __name__ == "__main__":
    unittest.main()
