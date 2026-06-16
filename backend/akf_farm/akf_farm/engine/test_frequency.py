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

    def test_years(self):
        # các tần suất thật trong quy-trinh-canh-tac.md
        self.assertEqual(parse_frequency("1 lần/20 năm"), ("every_n_days", 7300))
        self.assertEqual(parse_frequency("1095 ngày/lần"), ("every_n_days", 1095))
        self.assertEqual(parse_frequency("75 ngày/lần"), ("every_n_days", 75))

    def test_unknown_falls_back_one_time(self):
        self.assertEqual(parse_frequency("(theo mùa – cần bổ sung)"), ("one_time", 1))
        self.assertEqual(parse_frequency("—"), ("one_time", 1))
