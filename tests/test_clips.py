import tempfile
import unittest
from pathlib import Path

from tracker import data
from tracker.clips import build_plan, classify, hook_for, parse_filename, scan, to_game_rows, write_plan

START = "2026-10-01"


class TestParse(unittest.TestCase):
    def test_full_name(self):
        c = parse_filename("D3_G2_W_1532_vs1610_italian_queen sac_white_10min.mp4", START)
        self.assertEqual((c["day"], c["game_no"], c["result"]), (3, 2, "W"))
        self.assertEqual((c["rating"], c["opponent"]), (1532, 1610))
        self.assertEqual((c["opening"], c["color"], c["time_control"]), ("Italian Game", "white", "600"))
        self.assertIn("sacrifice", c["tags"])
        self.assertEqual(str(c["date"]), "2026-10-03")

    def test_obs_default_name_gives_date(self):
        c = parse_filename("2026-10-05 21-14-05.mkv", START)
        self.assertEqual(c["day"], 5)
        self.assertIsNone(c["rating"])

    def test_unknown_words_never_used(self):
        c = parse_filename("D2_W_1530_backrank mate_xXmagnusfan99.mp4", START)
        self.assertEqual(c["ignored"], ["xxmagnusfan99"])
        self.assertNotIn("magnus", hook_for(c, classify(c)[0]).lower())

    def test_styles(self):
        self.assertEqual(classify(parse_filename("D1_L_1500_blunder.mp4", START))[0], "mistake breakdown")
        self.assertEqual(classify(parse_filename("D1_W_1500_mate.mp4", START))[0], "puzzle")
        self.assertEqual(classify(parse_filename("D1_L_1500_flagged.mp4", START))[0], "time scramble")
        self.assertEqual(classify(parse_filename("D1_W_1500.mp4", START))[0], "rating update")


class TestPlan(unittest.TestCase):
    NAMES = ["D1_G1_W_1512_italian.mp4", "D1_G2_L_1500_blunder.mp4", "D1_G3_W_1522_queen sac.mp4",
             "D2_G1_W_1540_endgame.mp4", "D2_G2_L_1531_tilt.mp4"]

    def test_plan_uses_each_clip_once_and_real_numbers(self):
        cfg = data.load_config()
        cfg["start_date"] = START
        with tempfile.TemporaryDirectory() as tmp:
            for n in self.NAMES:
                (Path(tmp) / n).touch()
            clips = scan(tmp, START)
            pages, schedule, pre = build_plan(clips, cfg)
            reels = [r["source_file"] for r in schedule if r["type"].startswith("reel ")]
            self.assertEqual(len(reels), len(set(reels)))
            day2 = next(t for d, t in pages.items() if str(d) == "2026-10-02")
            self.assertIn("start of day: **1522**", day2)
            self.assertIn("end of day: **1531** (+9)", day2)
            out = write_plan(pages, schedule, pre, clips, Path(tmp) / "_posting_plan")
            self.assertTrue((out / "schedule.csv").exists())
            self.assertEqual(len(to_game_rows(clips)), 5)


if __name__ == "__main__":
    unittest.main()
