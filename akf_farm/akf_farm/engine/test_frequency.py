import unittest
from akf_farm.engine.frequency import parse_frequency


class TestFrequency(unittest.TestCase):
    def test_every_n_days(self):
        self.assertEqual(parse_frequency("7 ngày/lần"), ("every_n_days", 7))
        self.assertEqual(parse_frequency("2 ngày/lần"), ("every_n_days", 2))

    def test_daily(self):
        self.assertEqual(parse_frequency("Hàng ngày"), ("daily", 1))
        self.assertEqual(parse_frequency("1 ngày/lần"), ("daily", 1))

    def test_n_per_day(self):
        self.assertEqual(parse_frequency("2 lần/ngày"), ("n_per_day", 2))

    def test_one_time(self):
        self.assertEqual(parse_frequency("1 lần/chu kỳ"), ("one_time", 1))
