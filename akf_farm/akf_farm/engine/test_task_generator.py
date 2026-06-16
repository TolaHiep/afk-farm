import unittest
import datetime as dt
from akf_farm.engine.task_generator import compute_mandays, due_dates, dedupe_shared


class TestComputeMandays(unittest.TestCase):
    def test_per_ha_times_area(self):
        # step 3 công/ha trên lô 2ha (20000 m2) -> 6 công
        self.assertEqual(compute_mandays(3.0, 20000), 6.0)

    def test_shared_no_manday_is_zero(self):
        self.assertEqual(compute_mandays(0, 20000), 0)


class TestDueDates(unittest.TestCase):
    def d(self, s):
        return dt.date.fromisoformat(s)

    def test_every_n_days(self):
        out = due_dates(self.d("2026-01-01"), ("every_n_days", 20), self.d("2026-01-01"), self.d("2026-02-15"))
        self.assertEqual(out, [self.d("2026-01-01"), self.d("2026-01-21"), self.d("2026-02-10")])

    def test_daily(self):
        out = due_dates(self.d("2026-01-01"), ("daily", 1), self.d("2026-01-01"), self.d("2026-01-03"))
        self.assertEqual(len(out), 3)

    def test_one_time(self):
        out = due_dates(self.d("2026-01-01"), ("one_time", 1), self.d("2026-01-01"), self.d("2026-02-01"))
        self.assertEqual(out, [self.d("2026-01-01")])

    def test_one_time_before_window(self):
        out = due_dates(self.d("2025-12-01"), ("one_time", 1), self.d("2026-01-01"), self.d("2026-02-01"))
        self.assertEqual(out, [])


class TestDedupeShared(unittest.TestCase):
    def test_shared_same_block_day_merged(self):
        rows = [
            {"block": "B1", "date": "2026-01-01", "description": "Kiểm tra tưới", "scope": "shared", "crop": "Gấc"},
            {"block": "B1", "date": "2026-01-01", "description": "Kiểm tra tưới", "scope": "shared", "crop": "Sâm"},
            {"block": "B1", "date": "2026-01-01", "description": "Tưới nước", "scope": "per_crop", "crop": "Gấc"},
            {"block": "B1", "date": "2026-01-01", "description": "Tưới nước", "scope": "per_crop", "crop": "Sâm"},
        ]
        out = dedupe_shared(rows)
        # 1 shared gộp + 2 per_crop riêng = 3
        self.assertEqual(len(out), 3)
        shared = [r for r in out if r["scope"] == "shared"]
        self.assertEqual(len(shared), 1)
        self.assertEqual(shared[0]["crop"], "Chung")
