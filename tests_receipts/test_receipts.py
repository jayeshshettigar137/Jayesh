import unittest
from datetime import date

from receipts.claims import ABOVE, BELOW, FALSE, PENDING, TRUE, UNSCORABLE, Claim
from receipts.extract import extract, extract_with
from receipts.resolve import resolve
from receipts.score import score, wilson_lower

SAID = date(2026, 1, 10)


class ExtractTests(unittest.TestCase):
    def test_extracts_clear_numeric_claim(self):
        cs = extract("Honestly Bitcoin will hit $150,000 by the end of 2026. Great times.", "A", "u", SAID)
        self.assertEqual(len(cs), 1)
        c = cs[0]
        self.assertEqual((c.subject, c.direction, c.target, c.deadline),
                         ("Bitcoin", ABOVE, 150000.0, date(2026, 12, 31)))

    def test_units_and_below(self):
        c = extract("Tesla will drop to 100 by June 2026.", "A", "u", SAID)[0]
        self.assertEqual((c.direction, c.target, c.deadline), (BELOW, 100.0, date(2026, 6, 30)))
        c = extract("Nvidia will reach 5 trillion by 2027.", "A", "u", SAID)
        self.assertEqual(c, [])  # unsupported unit is not guessed at

    def test_vague_claims_not_extracted(self):
        self.assertEqual(extract("This is going to go absolutely crazy soon.", "A", "u", SAID), [])

    def test_past_deadline_ignored(self):
        self.assertEqual(extract("Bitcoin will hit $90k by 2020.", "A", "u", SAID), [])

    def test_llm_output_validated(self):
        cs = extract_with("x", lambda t: [{"text": "t", "subject": "BTC"}], "A", "u", SAID)
        self.assertEqual(cs[0].status, UNSCORABLE)


class ResolveScoreTests(unittest.TestCase):
    def claim(self, direction=ABOVE, target=100.0, deadline=date(2026, 6, 30)):
        return Claim("A", "u", SAID, "t", "X", direction, target, deadline)

    def test_true_false_pending(self):
        self.assertEqual(resolve(self.claim(), {date(2026, 3, 1): 120.0}, date(2026, 4, 1)).status, TRUE)
        self.assertEqual(resolve(self.claim(), {date(2026, 3, 1): 90.0}, date(2026, 7, 1)).status, FALSE)
        self.assertEqual(resolve(self.claim(), {date(2026, 3, 1): 90.0}, date(2026, 4, 1)).status, PENDING)

    def test_value_before_claim_date_does_not_count(self):
        self.assertEqual(resolve(self.claim(), {date(2025, 12, 1): 500.0}, date(2026, 7, 1)).status, FALSE)

    def test_scoring_requires_sample_and_uses_lower_bound(self):
        cs = []
        for i in range(10):
            c = self.claim(); c.status = TRUE if i < 3 else FALSE; cs.append(c)
        s = score(cs)["A"]
        self.assertTrue(s["ranked"]); self.assertEqual(s["hits"], 3)
        self.assertLess(s["hit_rate_lower_95"], 0.3)
        self.assertFalse(score(cs[:5])["A"]["ranked"])

    def test_wilson_small_sample_is_conservative(self):
        self.assertLess(wilson_lower(2, 2), 0.5)


if __name__ == "__main__":
    unittest.main()
