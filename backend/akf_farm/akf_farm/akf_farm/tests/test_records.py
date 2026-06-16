import frappe
from frappe.tests.utils import FrappeTestCase


class TestRecordDoctypes(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Vùng RC"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Vùng RC", "area": 50000}).insert()
        if not frappe.db.exists("Farm Block", "Lô RC1"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "Lô RC1", "zone": "Vùng RC", "area": 10000}).insert()

    def test_abnormal_report(self):
        a = frappe.get_doc({"doctype": "Abnormal Report", "type": "Sâu bệnh", "block": "Lô RC1",
                            "crop": "Gấc", "report_date": "2026-06-13", "description": "Sâu",
                            "status": "pending"}).insert()
        self.assertEqual(a.status, "pending")

    def test_support_request(self):
        s = frappe.get_doc({"doctype": "Support Request", "block": "Lô RC1", "type": "Vật tư",
                            "content": "Cần phân", "status": "pending"}).insert()
        self.assertTrue(s.name)

    def test_team_leader_report(self):
        r = frappe.get_doc({"doctype": "Team Leader Report", "block": "Lô RC1", "crop": "Sâm",
                            "report_date": "2026-06-14", "content": "OK", "abnormal": 0}).insert()
        self.assertEqual(r.status, "pending")

    def test_daily_production(self):
        d = frappe.get_doc({"doctype": "Daily Production", "block": "Lô RC1", "crop": "Gấc",
                            "prod_date": "2026-06-14", "quantity": 12.5, "unit": "kg"}).insert()
        self.assertTrue(d.name)

    def test_team_member(self):
        m = frappe.get_doc({"doctype": "Team Member", "member_name": "Nguyễn Văn G",
                            "phone": "0907890123"}).insert()
        self.assertTrue(m.name)

    def test_settings_single(self):
        s = frappe.get_single("AKF Settings")
        s.app_name = "AKF"
        s.save()
        self.assertEqual(frappe.get_single("AKF Settings").app_name, "AKF")
