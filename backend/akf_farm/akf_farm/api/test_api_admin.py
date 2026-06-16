import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import admin_api


class TestAdminApi(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z ADM"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z ADM", "area": 40000}).insert()
        if not frappe.db.exists("Farm Block", "B ADM"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B ADM", "zone": "Z ADM", "area": 10000}).insert()

    def test_list_zones(self):
        zs = admin_api.list_zones()
        self.assertTrue(any(z["id"] == "Z ADM" for z in zs))
        self.assertIn("plots", zs[0])

    def test_heatmap_shape(self):
        data = admin_api.heatmap()
        self.assertIn("zones", data)
        self.assertIn("plots", data)

    def test_reschedule_one_crop_only(self):
        frappe.db.delete("Farm Task", {"block": "B ADM"})
        g = frappe.get_doc({"doctype": "Farm Task", "title": "Tưới gấc", "block": "B ADM", "crop": "Gấc",
                            "task_date": "2026-06-14", "status": "pending"}).insert()
        s = frappe.get_doc({"doctype": "Farm Task", "title": "Tưới sâm", "block": "B ADM", "crop": "Sâm",
                            "task_date": "2026-06-14", "status": "pending"}).insert()
        admin_api.reschedule_task(g.name, "2026-06-16")
        self.assertEqual(str(frappe.db.get_value("Farm Task", g.name, "task_date")), "2026-06-16")
        self.assertEqual(str(frappe.db.get_value("Farm Task", s.name, "task_date")), "2026-06-14")
