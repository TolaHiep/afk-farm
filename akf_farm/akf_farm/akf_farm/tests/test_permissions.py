import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.permissions import farm_task_query


class TestPermissions(FrappeTestCase):
    def test_leader_query_limits_to_self(self):
        cond = farm_task_query("leaderA@akf.local")
        self.assertIn("team_leader", cond)
        self.assertIn("leaderA@akf.local", cond)

    def test_admin_query_no_limit(self):
        self.assertEqual(farm_task_query("Administrator"), "")
