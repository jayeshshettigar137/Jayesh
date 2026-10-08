import csv
import os
import tempfile
import unittest
from datetime import date

from receipts.build import DEFAULT_CFG, build
from receipts.claims import ABOVE, BELOW, FALSE, PENDING, TRUE, Claim
from receipts.data import FIELDS, load_resolutions
from receipts.resolve import resolve_evidence


def c(direction=ABOVE, target=150000.0):
    return Claim("A", "u", date(2025, 1, 1), "q", "BTC", direction, target, date(2025, 12, 31))


class EvidenceTests(unittest.TestCase):
    def test_true_false_pending(self):
        self.assertEqual(resolve_evidence(c(), 160000, date(2025, 10, 6), date(2026, 1, 1)).status, TRUE)
        self.assertEqual(resolve_evidence(c(), 126000, date(2025, 10, 6), date(2026, 1, 1)).status, FALSE)
        self.assertEqual(resolve_evidence(c(), 126000, date(2025, 10, 6), date(2025, 11, 1)).status, PENDING)

    def test_below_uses_trough(self):
        self.assertEqual(resolve_evidence(c(BELOW, 50000.0), 40000, date(2025, 3, 1), date(2025, 6, 1)).status, TRUE)

    def test_build_uses_evidence_without_prices(self):
        tmp = tempfile.mkdtemp(); d = os.path.join(tmp, "d"); os.makedirs(d)
        row = {"id": "r1", "speaker": "A", "source_url": "https://example.com/v", "said_on": "2025-01-01",
               "quote": "BTC will hit $150,000 by the end of 2025.", "subject": "BTC", "asset": "BTC",
               "direction": "above", "target": "150000", "deadline": "2025-12-31", "confidence": "",
               "verified": "yes", "sample": ""}
        with open(os.path.join(d, "claims.csv"), "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=FIELDS); w.writeheader(); w.writerow(row)
        with open(os.path.join(d, "resolutions.csv"), "w", newline="") as fh:
            fh.write("id,best_value,best_date,as_of,source_url\nr1,126000,2025-10-06,2026-01-02,https://example.com/data\n")
        build(d, os.path.join(tmp, "o"), DEFAULT_CFG)
        with open(os.path.join(tmp, "o", "c", "r1.html"), encoding="utf-8") as fh:
            html = fh.read()
        self.assertIn("WRONG", html)
        self.assertIn("target not reached", html)

    def test_rejects_non_http_source(self):
        p = os.path.join(tempfile.mkdtemp(), "resolutions.csv")
        with open(p, "w") as fh:
            fh.write("id,best_value,best_date,as_of,source_url\nr1,1,2025-01-01,2025-01-02,javascript:x\n")
        with self.assertRaises(ValueError):
            load_resolutions(p)


if __name__ == "__main__":
    unittest.main()
