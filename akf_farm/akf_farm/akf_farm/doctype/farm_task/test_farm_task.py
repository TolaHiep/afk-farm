import frappe
from frappe.tests.utils import FrappeTestCase


class TestFarmTask(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Vùng FT"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Vùng FT", "area": 50000}).insert()
        if not frappe.db.exists("Farm Block", "Lô FT1"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "Lô FT1", "zone": "Vùng FT", "area": 10000}).insert()

    def test_create_task(self):
        t = frappe.get_doc({
            "doctype": "Farm Task", "title": "Tưới nước", "block": "Lô FT1", "crop": "Gấc",
            "task_date": "2026-06-14", "status": "pending", "priority": "normal",
        }).insert()
        self.assertEqual(frappe.get_doc("Farm Task", t.name).status, "pending")
