import unittest
from akf_farm.engine.frequency import parse_frequency


class TestParseFrequency(unittest.TestCase):
    def test_one_time(self):
        self.assertEqual(parse_frequency("1 lần/chu kỳ"), ("one_time", 1, 1))

    def test_daily(self):
        self.assertEqual(parse_frequency("Hàng ngày"), ("daily", 1, 1))

    def test_n_per_day(self):
        self.assertEqual(parse_frequency("2 lần/ngày"), ("n_per_period", 1, 2))

    def test_every_n_days(self):
        self.assertEqual(parse_frequency("20 ngày/lần"), ("n_per_period", 20, 1))

    def test_n_years(self):
        self.assertEqual(parse_frequency("1 lần/20 năm"), ("n_per_period", 7300, 1))

    def test_default_one_time(self):
        self.assertEqual(parse_frequency("không rõ"), ("one_time", 1, 1))
