import unittest
from akf_farm.engine.workload_balancer import assign_leaders


class TestBalancer(unittest.TestCase):
    def test_prefers_block_owner(self):
        tasks = [{"id": "t1", "block": "B1", "mandays": 5}]
        owners = {"B1": "leaderA"}
        out = assign_leaders(tasks, owners, ["leaderA", "leaderB"])
        self.assertEqual(out["t1"], "leaderA")

    def test_balances_load(self):
        tasks = [{"id": str(i), "block": "B1", "mandays": 1} for i in range(4)]
        owners = {}  # không ai sở hữu -> chia đều
        out = assign_leaders(tasks, owners, ["A", "B"])
        from collections import Counter
        c = Counter(out.values())
        self.assertEqual(c["A"], c["B"])  # 2-2

    def test_initial_load_skews_assignment(self):
        # A đã có tải sẵn 10 -> 2 việc mới dồn cho B
        out = assign_leaders([{"id": "1", "block": "B", "mandays": 1},
                              {"id": "2", "block": "B", "mandays": 1}],
                             {}, ["A", "B"], initial_load={"A": 10})
        self.assertEqual(out["1"], "B")
        self.assertEqual(out["2"], "B")
