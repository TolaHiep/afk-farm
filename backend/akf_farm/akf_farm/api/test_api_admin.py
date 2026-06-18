import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import admin_api


class TestAdminPhotos(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z ADP"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z ADP", "area": 40000}).insert(ignore_permissions=True)
        if not frappe.db.exists("Farm Block", "B ADP"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B ADP", "zone": "Z ADP", "area": 10000}).insert(ignore_permissions=True)

    def test_list_reports_includes_photos(self):
        frappe.db.delete("Team Leader Report", {"client_uuid": "adp1"})
        frappe.get_doc({"doctype": "Team Leader Report", "block": "B ADP", "crop": "Gấc",
                        "report_date": "2026-06-14", "content": "x", "client_uuid": "adp1",
                        "photos": [{"image": "/private/files/r1.jpg"}]}).insert(ignore_permissions=True)
        rows = admin_api.list_reports()
        row = next(r for r in rows if r["content"] == "x" and r["plotId"] == "B ADP")
        self.assertIn("photos", row)
        self.assertIn("/private/files/r1.jpg", row["photos"])

    def test_task_photos_returns_image_urls(self):
        t = frappe.get_doc({"doctype": "Farm Task", "title": "T ADP", "block": "B ADP", "crop": "Gấc",
                            "task_date": "2026-06-14", "status": "completed",
                            "photos": [{"image": "/private/files/t1.jpg"}, {"image": "/private/files/t2.jpg"}]}).insert(ignore_permissions=True)
        urls = admin_api.task_photos(t.name)
        self.assertEqual(urls, ["/private/files/t1.jpg", "/private/files/t2.jpg"])


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
