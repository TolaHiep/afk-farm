import unittest
from akf_farm.engine.task_generator import compute_mandays


class TestComputeMandays(unittest.TestCase):
    def test_per_ha_times_area(self):
        # step 3 công/ha trên lô 2ha (20000 m2) -> 6 công
        self.assertEqual(compute_mandays(3.0, 20000), 6.0)

    def test_shared_no_manday_is_zero(self):
        self.assertEqual(compute_mandays(0, 20000), 0)
