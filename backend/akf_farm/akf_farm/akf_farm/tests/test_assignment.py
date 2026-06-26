import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.engine.task_generator import (
    assign_tasks, mark_overdue, reassign_inactive_leader, _active_leaders, reassign_cycle_tasks,
)


def _mk_leader(email):
    if not frappe.db.exists("User", email):
        frappe.get_doc({"doctype": "User", "email": email, "first_name": email.split("@")[0],
                        "enabled": 1, "roles": [{"role": "AKF Team Leader"}]}).insert(ignore_permissions=True)


class TestAssignment(FrappeTestCase):
    def setUp(self):
        _mk_leader("la@akf.local")
        _mk_leader("lb@akf.local")
        if not frappe.db.exists("Farm Zone", "Z ASG"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z ASG", "area": 40000}).insert()
        if not frappe.db.exists("Farm Block", "B ASG"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B ASG", "zone": "Z ASG",
                            "area": 10000, "team_leader": "la@akf.local"}).insert()

    def _task(self, date, leader=None, status="pending"):
        return frappe.get_doc({"doctype": "Farm Task", "title": "Việc", "block": "B ASG", "crop": "Gấc",
                               "task_date": date, "status": status, "team_leader": leader, "mandays": 1}).insert()

    def test_assign_to_block_owner(self):
        t1 = self._task("2026-07-01")
        t2 = self._task("2026-07-01")
        assign_tasks(from_date="2026-07-01", days=1)
        # chủ lô là la -> cả 2 việc về la (ưu tiên chủ lô)
        self.assertEqual(frappe.db.get_value("Farm Task", t1.name, "team_leader"), "la@akf.local")
        self.assertEqual(frappe.db.get_value("Farm Task", t2.name, "team_leader"), "la@akf.local")

    def test_mark_overdue(self):
        t = self._task("2026-06-01")  # quá khứ
        mark_overdue(today="2026-06-16")
        self.assertEqual(frappe.db.get_value("Farm Task", t.name, "status"), "overdue")

    def test_reassign_when_leader_inactive(self):
        t = self._task("2026-08-01", leader="la@akf.local")
        # la nghỉ -> không còn trong active leaders
        frappe.db.set_value("User", "la@akf.local", "enabled", 0)
        reassign_inactive_leader("la@akf.local")
        new_leader = frappe.db.get_value("Farm Task", t.name, "team_leader")
        self.assertNotEqual(new_leader, "la@akf.local")
        self.assertIn(new_leader, _active_leaders())

    def test_administrator_not_a_leader(self):
        # Administrator có mọi role nhưng KHÔNG được coi là tổ trưởng nhận việc
        self.assertNotIn("Administrator", _active_leaders())

    def test_reassign_cycle_tasks_skips_completed(self):
        # 2 việc chưa xong + 1 đã hoàn thành -> chỉ 2 việc chưa xong đổi sang lb
        frappe.get_doc({"doctype": "Crop Cycle", "block": "B ASG", "crop": "Gấc",
                        "start_date": "2026-07-01", "status": "active"}).insert()
        cyc = frappe.get_all("Crop Cycle", filters={"block": "B ASG", "crop": "Gấc"}, pluck="name")[0]
        t_pending = frappe.get_doc({"doctype": "Farm Task", "title": "P", "block": "B ASG", "crop": "Gấc",
                                    "cycle": cyc, "task_date": "2026-07-02", "status": "pending",
                                    "team_leader": "la@akf.local", "mandays": 1}).insert()
        t_overdue = frappe.get_doc({"doctype": "Farm Task", "title": "O", "block": "B ASG", "crop": "Gấc",
                                    "cycle": cyc, "task_date": "2026-06-01", "status": "overdue",
                                    "team_leader": "la@akf.local", "mandays": 1}).insert()
        t_done = frappe.get_doc({"doctype": "Farm Task", "title": "D", "block": "B ASG", "crop": "Gấc",
                                 "cycle": cyc, "task_date": "2026-07-02", "status": "completed",
                                 "team_leader": "la@akf.local", "mandays": 1}).insert()
        n = reassign_cycle_tasks(cyc, "lb@akf.local")
        self.assertEqual(n, 2)
        self.assertEqual(frappe.db.get_value("Farm Task", t_pending.name, "team_leader"), "lb@akf.local")
        self.assertEqual(frappe.db.get_value("Farm Task", t_overdue.name, "team_leader"), "lb@akf.local")
        # việc đã hoàn thành giữ nguyên tổ trưởng cũ (lịch sử)
        self.assertEqual(frappe.db.get_value("Farm Task", t_done.name, "team_leader"), "la@akf.local")
