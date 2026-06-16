import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import field_api


class TestFieldApi(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z FLD"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z FLD", "area": 40000}).insert()
        if not frappe.db.exists("Farm Block", "B FLD"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B FLD", "zone": "Z FLD", "area": 10000}).insert()
        self.t = frappe.get_doc({"doctype": "Farm Task", "title": "Tưới", "block": "B FLD", "crop": "Gấc",
                                 "task_date": "2026-06-14", "status": "pending", "require_photo": 0}).insert()

    def test_complete_task(self):
        field_api.complete_task(self.t.name, client_uuid="u1")
        self.assertEqual(frappe.db.get_value("Farm Task", self.t.name, "status"), "completed")

    def test_complete_requires_photo_when_flagged(self):
        self.t.require_photo = 1
        self.t.save()
        with self.assertRaises(frappe.ValidationError):
            field_api.complete_task(self.t.name, client_uuid="u2", photos=[])

    def test_daily_report_idempotent(self):
        frappe.db.delete("Team Leader Report", {"client_uuid": "r1"})
        field_api.submit_report(block="B FLD", crop="Gấc", date="2026-06-14",
                                content="ok", photos=["/files/a.jpg"], client_uuid="r1")
        field_api.submit_report(block="B FLD", crop="Gấc", date="2026-06-14",
                                content="ok", photos=["/files/a.jpg"], client_uuid="r1")
        self.assertEqual(frappe.db.count("Team Leader Report", {"client_uuid": "r1"}), 1)
