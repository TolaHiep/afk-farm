import unittest
import datetime as dt
from akf_farm.engine.task_generator import compute_mandays, due_dates, dedupe_shared


class TestComputeMandays(unittest.TestCase):
    def test_per_ha_times_area(self):
        # step 3 công/ha trên lô 2ha (20000 m2) -> 6 công
        self.assertEqual(compute_mandays(3.0, 20000), 6.0)

    def test_shared_no_manday_is_zero(self):
        self.assertEqual(compute_mandays(0, 20000), 0)

    def test_rounds_to_two_decimals(self):
        # 1.5 công/ha trên 12345 m2 (1.2345 ha) = 1.85175 -> 1.85
        self.assertEqual(compute_mandays(1.5, 12345), 1.85)


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

    def test_every_n_days_start_before_window(self):
        # start 2026-01-01, step 20, window starts 2026-01-15 -> first due is 2026-01-21
        out = due_dates(self.d("2026-01-01"), ("every_n_days", 20), self.d("2026-01-15"), self.d("2026-02-15"))
        self.assertEqual(out, [self.d("2026-01-21"), self.d("2026-02-10")])

    def test_n_per_day_one_per_day_at_date_level(self):
        out = due_dates(self.d("2026-01-01"), ("n_per_day", 2), self.d("2026-01-01"), self.d("2026-01-03"))
        self.assertEqual(out, [self.d("2026-01-01"), self.d("2026-01-02"), self.d("2026-01-03")])

    def test_cadence_empty_when_start_after_window(self):
        out = due_dates(self.d("2026-03-01"), ("every_n_days", 5), self.d("2026-01-01"), self.d("2026-02-01"))
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

    def test_does_not_mutate_input(self):
        rows = [{"block": "B1", "date": "2026-01-01", "description": "X", "scope": "shared", "crop": "Gấc"}]
        dedupe_shared(rows)
        self.assertEqual(rows[0]["crop"], "Gấc")  # original unchanged


