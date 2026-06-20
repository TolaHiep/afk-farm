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
        rows = admin_api.task_photos(t.name)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["url"], "/private/files/t1.jpg")
        self.assertEqual(rows[1]["url"], "/private/files/t2.jpg")
        self.assertIn("gpsStatus", rows[0])
        self.assertIn("inApp", rows[0])


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

    def test_delete_zone_cascades_blocks_and_dependents(self):
        """Xoá vùng phải xoá luôn lô bên trong + việc phụ thuộc (regression: xoá xong reload vẫn còn)."""
        frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z DEL", "area": 40000}).insert()
        frappe.get_doc({"doctype": "Farm Block", "block_name": "B DEL", "zone": "Z DEL", "area": 10000}).insert()
        frappe.get_doc({"doctype": "Farm Task", "title": "T DEL", "block": "B DEL", "crop": "Gấc",
                        "task_date": "2026-06-14", "status": "pending"}).insert()
        admin_api.delete_zone("Z DEL")
        self.assertFalse(frappe.db.exists("Farm Zone", "Z DEL"))
        self.assertFalse(frappe.db.exists("Farm Block", "B DEL"))
        self.assertEqual(frappe.db.count("Farm Task", {"block": "B DEL"}), 0)

    def test_update_process_regenerates_active_cycle_tasks(self):
        """Sửa quy trình -> việc của chu kỳ active sinh lại theo cấu hình mới (regression #1)."""
        from frappe.utils import getdate
        today = str(getdate())
        if frappe.db.exists("Cultivation Process", "P RG"):
            frappe.delete_doc("Cultivation Process", "P RG", force=True)
        for c in frappe.get_all("Crop Cycle", filters={"block": "B ADM", "crop": "Gấc"}, pluck="name"):
            frappe.delete_doc("Crop Cycle", c, force=True)
        admin_api.create_process("P RG", crop="Gấc", cycle_length_days=30, steps=[
            {"description": "Tưới", "frequencyType": "one_time", "scopeRaw": "per_crop",
             "offsetDays": 0, "estimatedDays": 1, "workPerHa": 1}])
        cyc = admin_api.create_crop_cycle("B ADM", "Gấc", today, cultivation_process="P RG")
        self.assertTrue(frappe.db.exists("Farm Task", {"cycle": cyc["id"], "title": "Tưới"}))
        # Sửa bước -> sinh lại: "Bón phân" xuất hiện, "Tưới" bị gỡ
        admin_api.update_process("P RG", steps=[
            {"description": "Bón phân", "frequencyType": "one_time", "scopeRaw": "per_crop",
             "offsetDays": 0, "estimatedDays": 1, "workPerHa": 1}])
        self.assertTrue(frappe.db.exists("Farm Task", {"cycle": cyc["id"], "title": "Bón phân"}))
        self.assertFalse(frappe.db.exists("Farm Task", {"cycle": cyc["id"], "title": "Tưới"}))
