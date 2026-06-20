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

    def test_step_sop_roundtrip_and_task_detail(self):
        """SOP nhập ở bước quy trình -> list_processes trả về + task_detail trả đúng SOP của việc."""
        from akf_farm.api import field_api
        from frappe.utils import getdate
        today = str(getdate())
        if frappe.db.exists("Cultivation Process", "P SOP"):
            frappe.delete_doc("Cultivation Process", "P SOP", force=True)
        for c in frappe.get_all("Crop Cycle", filters={"block": "B ADM", "crop": "Sâm"}, pluck="name"):
            frappe.delete_doc("Crop Cycle", c, force=True)
        admin_api.create_process("P SOP", crop="Sâm", cycle_length_days=30, steps=[
            {"description": "Tưới", "frequencyType": "one_time", "scopeRaw": "per_crop",
             "offsetDays": 0, "sop": "- Tưới đều\n- Giữ ẩm 60-70%"}])
        p = next(x for x in admin_api.list_processes() if x["id"] == "P SOP")
        self.assertEqual(p["steps"][0]["sop"], "- Tưới đều\n- Giữ ẩm 60-70%")
        cyc = admin_api.create_crop_cycle("B ADM", "Sâm", today, cultivation_process="P SOP")
        names = frappe.get_all("Farm Task", filters={"cycle": cyc["id"], "title": "Tưới"}, pluck="name")
        self.assertTrue(names)
        self.assertEqual(field_api.task_detail(names[0])["sop"], "- Tưới đều\n- Giữ ẩm 60-70%")

    _PNG_1PX = ("data:image/png;base64,"
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")

    def test_upload_logo_sets_settings(self):
        r = admin_api.upload_logo(self._PNG_1PX)
        self.assertTrue(r["ok"])
        self.assertTrue(r["logoUrl"].startswith("/files/"))
        self.assertEqual(frappe.get_single("AKF Settings").logo_url, r["logoUrl"])

    def test_send_test_email_graceful_when_disabled(self):
        s = frappe.get_single("AKF Settings")
        s.email_enabled = 0
        s.save(ignore_permissions=True)
        r = admin_api.send_test_email("x@example.com")
        self.assertFalse(r["ok"])  # không raise, trả ok=False để UI báo nhẹ nhàng

    def test_daily_notifications_counts_overdue_and_anomalies(self):
        frappe.get_doc({"doctype": "Farm Task", "title": "QH", "block": "B ADM", "crop": "Gấc",
                        "task_date": "2026-06-01", "status": "overdue"}).insert(ignore_permissions=True)
        frappe.db.delete("Team Leader Report", {"client_uuid": "dn1"})
        frappe.get_doc({"doctype": "Team Leader Report", "block": "B ADM", "crop": "Gấc",
                        "report_date": "2026-06-20", "content": "sâu bệnh", "abnormal": 1,
                        "client_uuid": "dn1"}).insert(ignore_permissions=True)
        r = admin_api.send_daily_notifications()
        self.assertGreaterEqual(r["overdue"], 1)
        self.assertGreaterEqual(r["anomalies"], 1)
