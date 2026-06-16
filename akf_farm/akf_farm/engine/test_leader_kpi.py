import unittest
from akf_farm.engine.leader_kpi import compute_kpi


class TestKpi(unittest.TestCase):
    def test_basic(self):
        tasks = [
            {"status": "completed", "on_time": True, "mandays": 10},
            {"status": "completed", "on_time": False, "mandays": 10},
            {"status": "overdue", "on_time": False, "mandays": 10},
            {"status": "pending", "on_time": False, "mandays": 10},
        ]
        report_days = {"2026-06-13": True, "2026-06-14": False}
        k = compute_kpi(tasks, report_days, anomaly_count=2)
        self.assertEqual(k["completed"], 2)
        self.assertEqual(k["overdue"], 1)
        self.assertEqual(k["not_done"], 2)
        self.assertEqual(k["on_time_pct"], 50.0)
        self.assertEqual(k["full_report_pct"], 50.0)
        self.assertEqual(k["anomalies"], 2)
        self.assertEqual(k["total_work"], 40)

    def test_empty(self):
        k = compute_kpi([], {}, anomaly_count=0)
        self.assertEqual(k["on_time_pct"], 0.0)
        self.assertEqual(k["full_report_pct"], 0.0)
        self.assertEqual(k["total_work"], 0)
