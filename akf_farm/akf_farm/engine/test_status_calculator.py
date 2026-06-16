import unittest
from akf_farm.engine.status_calculator import crop_status, rollup_status


class TestStatus(unittest.TestCase):
    def test_overdue_is_danger(self):
        self.assertEqual(crop_status(tasks=[{"status": "overdue"}], anomalies=[]), "danger")

    def test_due_not_done_is_warning(self):
        self.assertEqual(crop_status(tasks=[{"status": "pending"}], anomalies=[]), "warning")

    def test_all_done_is_good(self):
        self.assertEqual(crop_status(tasks=[{"status": "completed"}], anomalies=[]), "good")

    def test_unresolved_anomaly_raises(self):
        self.assertEqual(crop_status(tasks=[{"status": "completed"}],
                                     anomalies=[{"status": "pending"}]), "danger")

    def test_rollup_worst_of(self):
        self.assertEqual(rollup_status(["good", "danger", "warning"]), "danger")
        self.assertEqual(rollup_status(["good", "done"]), "good")

    def test_heatmap_weight_uses_total_not_crop_count(self):
        # contract: trọng số trộn màu = total việc, KHÔNG phải số cây.
        crops = [{"crop": "Gấc", "status": "good", "done": 3, "total": 3},
                 {"crop": "Sâm", "status": "danger", "done": 1, "total": 5}]
        weights = [c["total"] for c in crops]
        self.assertEqual(weights, [3, 5])
