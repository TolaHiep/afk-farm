import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import admin_api, field_api


class TestApiExtra(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z EX"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z EX", "area": 40000}).insert()
        if not frappe.db.exists("Farm Block", "B EX"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B EX", "zone": "Z EX", "area": 10000}).insert()

    def test_list_processes_shape(self):
        if not frappe.db.exists("Cultivation Process", "P EX"):
            frappe.get_doc({"doctype": "Cultivation Process", "process_name": "P EX", "crop": "Gấc",
                "steps": [{"step": 1, "description": "Tưới", "mandays_per_ha": 2,
                           "frequency_type": "n_per_period", "frequency_value": 7, "scope": "per_crop"}]}).insert()
        procs = admin_api.list_processes()
        p = next(x for x in procs if x["id"] == "P EX")
        self.assertEqual(p["steps"][0]["frequency"], "1 lần / 7 ngày")
        self.assertEqual(p["steps"][0]["scope"], "Theo cây")

    def test_crop_cycles_and_dashboard(self):
        if not frappe.db.exists("Crop Cycle", {"block": "B EX", "crop": "Gấc"}):
            frappe.get_doc({"doctype": "Crop Cycle", "block": "B EX", "crop": "Gấc",
                            "start_date": "2026-06-01", "status": "active"}).insert()
        cycles = admin_api.list_crop_cycles()
        self.assertTrue(any(c["plotId"] == "B EX" for c in cycles))
        d = admin_api.dashboard()
        self.assertIn("areaStats", d)
        self.assertIn("totalHa", d["areaStats"])

    def test_settings_roundtrip(self):
        admin_api.save_settings(appName="AKF Test", emailEnabled=1)
        s = admin_api.get_settings()
        self.assertEqual(s["appName"], "AKF Test")
        self.assertTrue(s["emailEnabled"])

    def test_field_upcoming_and_support(self):
        frappe.get_doc({"doctype": "Farm Task", "title": "Việc mai", "block": "B EX", "crop": "Gấc",
                        "task_date": "2026-06-15", "status": "pending",
                        "team_leader": "Administrator"}).insert()
        up = field_api.upcoming_tasks(from_date="2026-06-14", days=10)
        self.assertTrue(any(t["title"] == "Việc mai" for t in up))
        r = field_api.submit_support(block="B EX", type="Vật tư", content="Cần phân")
        self.assertTrue(r["ok"])
