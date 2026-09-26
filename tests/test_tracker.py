import csv
import tempfile
import unittest
from pathlib import Path

from tracker import analysis as A
from tracker import data
from tracker.content import enrich, ladder_variations, length_bucket, pillar_mix, rank_by
from tracker.fetch import append_new, to_rows
from tracker.report import build_daily_report, mistakes_report, status_line

FIXTURES = Path(__file__).parent / "fixtures"


class FixtureCase(unittest.TestCase):
    def setUp(self):
        self.config = data.load_config()
        self.daily = data.load_daily(FIXTURES)
        self.games = data.load_games(FIXTURES)
        self.content = data.load_content(FIXTURES)


class TestData(FixtureCase):
    def test_loads_and_coerces(self):
        self.assertEqual([r["day"] for r in self.daily], [1, 2, 3])
        self.assertEqual(self.daily[-1]["rating"], 1486)
        self.assertEqual(self.games[1]["mistakes"], ["tactical", "time"])
        self.assertTrue(self.games[1]["content_worthy"])
        self.assertEqual(self.content[0]["views"], 12000)

    def test_to_num(self):
        self.assertIsNone(data.to_num(""))
        self.assertEqual(data.to_num("1,200", int), 1200)
        self.assertEqual(data.to_num("55%"), 55.0)
        self.assertIsNone(data.to_num("abc", int))

    def test_empty_repo_data_has_headers_only(self):
        repo_data = data.REPO_ROOT / "data"
        self.assertEqual(data.load_daily(repo_data), [])
        self.assertEqual(data.load_games(repo_data), [])
        self.assertEqual(data.load_content(repo_data), [])


class TestAnalysis(FixtureCase):
    def test_status_uses_logged_numbers(self):
        s = A.challenge_status(self.config, self.daily, 3)
        self.assertEqual(s["rating"], 1486)
        self.assertEqual(s["delta"], -61)
        self.assertEqual(s["to_go"], 514)
        self.assertEqual(s["days_left"], 27)
        self.assertEqual(s["required_per_day"], 19.0)
        self.assertEqual(s["peak"], 1547)

    def test_to_go_never_negative(self):
        daily = [{"day": 1, "rating": 2010}]
        self.assertEqual(A.challenge_status(self.config, daily, 1)["to_go"], 0)

    def test_phases_and_stages(self):
        self.assertEqual(A.phase(1)[0], "DIAGNOSE")
        self.assertEqual(A.phase(8)[0], "INTENSIVE CLIMB")
        self.assertEqual(A.phase(21)[0], "PERSONALISE")
        self.assertEqual(A.phase(30)[0], "FINAL PUSH")
        self.assertEqual(A.stage(1500)[0], 1)
        self.assertEqual(A.stage(1700)[0], 2)
        self.assertEqual(A.stage(1900)[0], 3)
        self.assertEqual(A.stage(2000)[0], 4)

    def test_rating_changes_and_stop_rule(self):
        A.with_rating_changes(self.games, 1500)
        self.assertEqual(self.games[0]["rating_change"], 8)
        day3 = [g for g in self.games if g["day"] == 3]
        self.assertEqual(A.longest_loss_run(day3), 4)
        alerts = A.stop_rule_alerts(day3, -61)
        self.assertTrue(alerts[0].startswith("STOP RULE"))

    def test_top_weakness_and_counts(self):
        counts = A.mistake_counts(self.games)
        self.assertEqual(counts["tactical"], 3)
        self.assertEqual(counts["time"], 3)
        self.assertIn(A.top_weakness(self.games, 3), ("tactical", "time"))

    def test_best_game_prefers_flagged_swing(self):
        A.with_rating_changes(self.games, 1500)
        best, why = A.best_game_for_content([g for g in self.games if g["day"] == 3])
        self.assertTrue(best["content_worthy"])
        self.assertTrue(why)


class TestContent(FixtureCase):
    def test_scores_rank_winner_first(self):
        posts = enrich(self.content)
        self.assertEqual(rank_by(posts, "hook")[0]["label"], "Why 1500s keep blundering queens")

    def test_ladder_variations(self):
        v = ladder_variations("Why 1500s keep blundering queens")
        self.assertIn("Why 1600s keep blundering queens", v)
        self.assertNotIn("Why 1500s keep blundering queens", v)
        self.assertEqual(ladder_variations("No rating here"), [])

    def test_length_bucket(self):
        self.assertEqual(length_bucket(10), "<15s")
        self.assertEqual(length_bucket(22), "15–30s")
        self.assertEqual(length_bucket(None), "unknown")

    def test_pillar_mix(self):
        mix = {p["pillar"]: p for p in pillar_mix(self.content, self.config["pillar_targets"])}
        self.assertEqual(mix["journey"]["count"], 3)
        self.assertAlmostEqual(mix["journey"]["actual"], 0.5)

    def test_zero_views_ignored(self):
        self.assertEqual(enrich([{"views": 0}]), [])


class TestReports(FixtureCase):
    def test_daily_report_has_ten_sections(self):
        text = build_daily_report(self.config, self.daily, self.games, self.content)
        for n in range(1, 11):
            self.assertIn(f"## {n}.", text)
        self.assertIn("RATING: 1486", text)
        self.assertIn("I dropped 61 rating today.", text)

    def test_report_without_data(self):
        self.assertIn("No days logged yet", build_daily_report(self.config, [], [], []))

    def test_status_and_mistakes(self):
        self.assertIn("514 to go", status_line(self.config, self.daily))
        self.assertIn("tactical", mistakes_report(self.games, self.config))


class TestFetch(unittest.TestCase):
    API_GAMES = [
        {"end_time": 1791021600, "rules": "chess", "time_class": "rapid", "time_control": "900+10",
         "white": {"username": "Me", "rating": 1510, "result": "win"},
         "black": {"username": "opp", "rating": 1490, "result": "resigned"},
         "accuracies": {"white": 81.23, "black": 70.1},
         "pgn": '[ECOUrl "https://www.chess.com/openings/Italian-Game-Two-Knights-Defense"]'},
        {"end_time": 1791022100, "rules": "chess", "time_class": "blitz", "time_control": "180",
         "white": {"username": "opp2", "rating": 1400, "result": "win"},
         "black": {"username": "me", "rating": 1450, "result": "checkmated"}},
        {"end_time": 1791022600, "rules": "chess", "time_class": "rapid", "time_control": "900+10",
         "white": {"username": "opp3", "rating": 1520, "result": "agreed"},
         "black": {"username": "ME", "rating": 1511, "result": "agreed"}},
    ]

    def test_to_rows_filters_pool_and_hides_usernames(self):
        rows = to_rows(self.API_GAMES, "me", "2026-10-01", "rapid")
        self.assertEqual([r["result"] for r in rows], ["W", "D"])
        self.assertEqual(rows[0]["opening"], "Italian Game Two Knights Defense")
        self.assertEqual(rows[0]["accuracy"], 81.2)
        self.assertEqual(rows[1]["color"], "black")
        for row in rows:
            self.assertNotIn("opp", " ".join(str(v) for v in row.values()).lower())

    def test_append_new_dedupes(self):
        rows = to_rows(self.API_GAMES, "me", "2026-10-01", None)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "games.csv"
            self.assertEqual(append_new(rows, path), 3)
            self.assertEqual(append_new(rows, path), 0)
            with path.open(newline="") as f:
                self.assertEqual(len(list(csv.DictReader(f))), 3)


if __name__ == "__main__":
    unittest.main()
