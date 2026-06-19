import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import field_api


def _mk_leader(email):
    if not frappe.db.exists("User", email):
        frappe.get_doc({"doctype": "User", "email": email, "first_name": email.split("@")[0],
                        "enabled": 1, "roles": [{"role": "AKF Team Leader"}]}).insert(ignore_permissions=True)
    return email


class TestFieldApi(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z FLD"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z FLD", "area": 40000}).insert()
        if not frappe.db.exists("Farm Block", "B FLD"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B FLD", "zone": "Z FLD", "area": 10000}).insert()
        self.leader = _mk_leader("fld_leader@akf.local")
        self.t = frappe.get_doc({"doctype": "Farm Task", "title": "Tưới", "block": "B FLD", "crop": "Gấc",
                                 "task_date": "2026-06-14", "status": "pending", "require_photo": 0,
                                 "team_leader": self.leader}).insert()

    def tearDown(self):
        frappe.set_user("Administrator")

    def test_complete_task(self):
        field_api.complete_task(self.t.name, client_uuid="u1")
        self.assertEqual(frappe.db.get_value("Farm Task", self.t.name, "status"), "completed")

    def test_complete_task_as_leader_role(self):
        """Tổ trưởng (role AKF Team Leader) phải hoàn thành được việc của mình - regression cho lỗi quyền."""
        frappe.set_user(self.leader)
        field_api.complete_task(self.t.name, client_uuid="u1b")
        self.assertEqual(frappe.db.get_value("Farm Task", self.t.name, "status"), "completed")

    def test_leader_cannot_complete_others_task(self):
        other = _mk_leader("fld_other@akf.local")
        frappe.set_user(other)
        with self.assertRaises(frappe.PermissionError):
            field_api.complete_task(self.t.name, client_uuid="u1c")

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

    def test_report_and_support_as_leader_role(self):
        """Tổ trưởng phải gửi được báo cáo + yêu cầu hỗ trợ - regression cho lỗi quyền tạo."""
        frappe.set_user(self.leader)
        frappe.db.delete("Team Leader Report", {"client_uuid": "rL"})
        field_api.submit_report(block="B FLD", crop="Gấc", date="2026-06-14",
                                content="ok", photos=["/files/a.jpg"], client_uuid="rL")
        self.assertEqual(frappe.db.count("Team Leader Report", {"client_uuid": "rL"}), 1)
        r = field_api.submit_support(block="B FLD", type="Khác", content="cần hỗ trợ")
        self.assertTrue(r["ok"])

    # 1x1 px PNG hợp lệ, base64
    _PNG_1PX = (
        "data:image/png;base64,"
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )

    def _file_count(self, dt, dn):
        return frappe.db.count("File", {"attached_to_doctype": dt, "attached_to_name": dn})

    def test_complete_task_saves_real_photo(self):
        frappe.set_user(self.leader)
        field_api.complete_task(self.t.name, client_uuid="ph1", photos=[self._PNG_1PX])
        urls = [r.image for r in frappe.get_doc("Farm Task", self.t.name).photos]
        self.assertEqual(len(urls), 1)
        self.assertTrue(urls[0].startswith("/private/files/"))
        self.assertEqual(self._file_count("Farm Task", self.t.name), 1)

    def test_complete_task_photo_replay_no_duplicate_file(self):
        frappe.set_user(self.leader)
        field_api.complete_task(self.t.name, client_uuid="ph2", photos=[self._PNG_1PX])
        # replay cung client_uuid sau khi da completed -> khong tao file thu 2
        field_api.complete_task(self.t.name, client_uuid="ph2", photos=[self._PNG_1PX])
        self.assertEqual(self._file_count("Farm Task", self.t.name), 1)

    def test_existing_url_kept_not_reuploaded(self):
        frappe.set_user(self.leader)
        field_api.complete_task(self.t.name, client_uuid="ph3", photos=["/private/files/already.jpg"])
        urls = [r.image for r in frappe.get_doc("Farm Task", self.t.name).photos]
        self.assertEqual(urls, ["/private/files/already.jpg"])
        self.assertEqual(self._file_count("Farm Task", self.t.name), 0)

    def test_submit_report_saves_real_photo(self):
        frappe.set_user(self.leader)
        frappe.db.delete("Team Leader Report", {"client_uuid": "phR"})
        r = field_api.submit_report(block="B FLD", crop="Gấc", date="2026-06-14",
                                    content="bất thường", photos=[self._PNG_1PX], abnormal=1, client_uuid="phR")
        doc = frappe.get_doc("Team Leader Report", r["name"])
        self.assertEqual(len(doc.photos), 1)
        self.assertTrue(doc.photos[0].image.startswith("/private/files/"))
        self.assertEqual(self._file_count("Team Leader Report", r["name"]), 1)

    def test_submit_support_saves_real_photo(self):
        frappe.set_user(self.leader)
        frappe.db.delete("Support Request", {"content": "cần giúp"})
        r = field_api.submit_support(block="B FLD", type="Khác", content="cần giúp", photos=[self._PNG_1PX])
        doc = frappe.get_doc("Support Request", r["name"])
        self.assertEqual(len(doc.photos), 1)
        self.assertTrue(doc.photos[0].image.startswith("/private/files/"))
        self.assertEqual(self._file_count("Support Request", r["name"]), 1)

    def test_photo_count_capped_at_5(self):
        frappe.set_user(self.leader)
        six_photos = [self._PNG_1PX] * 6
        field_api.complete_task(self.t.name, client_uuid="cap5", photos=six_photos)
        self.assertEqual(self._file_count("Farm Task", self.t.name), 5)

    def test_disallowed_ext_skipped(self):
        frappe.set_user(self.leader)
        svg_url = "data:image/svg+xml;base64,PHN2Zy8+"
        field_api.complete_task(self.t.name, client_uuid="svgskip", photos=[svg_url])
        self.assertEqual(self._file_count("Farm Task", self.t.name), 0)

    def test_oversized_photo_skipped(self):
        from akf_farm.api import field_api as _fa
        orig = _fa._MAX_PHOTO_BYTES
        _fa._MAX_PHOTO_BYTES = 10
        try:
            frappe.set_user(self.leader)
            field_api.complete_task(self.t.name, client_uuid="big1", photos=[self._PNG_1PX])
        finally:
            _fa._MAX_PHOTO_BYTES = orig
        self.assertEqual(self._file_count("Farm Task", self.t.name), 0)

    # Polygon vuong ~110m quanh (11.94, 108.458) — GeoJSON [lng,lat], ring khep kin
    _BOUNDARY = (
        '{"type":"Polygon","coordinates":[[[108.4575,11.9395],[108.4585,11.9395],'
        '[108.4585,11.9405],[108.4575,11.9405],[108.4575,11.9395]]]}'
    )

    def _mk_block_with_boundary(self):
        if not frappe.db.exists("Farm Block", "B GEO"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B GEO", "zone": "Z FLD",
                            "area": 10000, "boundary": self._BOUNDARY}).insert(ignore_permissions=True)
        return "B GEO"

    def test_geo_flag(self):
        blk = self._mk_block_with_boundary()
        self.assertEqual(field_api._geo_flag(blk, 11.9400, 108.4580)[0], "ok")        # trong polygon
        self.assertEqual(field_api._geo_flag(blk, 11.94075, 108.4580)[0], "ok")       # ngoai ~27.8m <= 50
        st, dist = field_api._geo_flag(blk, 11.9410, 108.4580)                        # ngoai ~55.7m > 50
        self.assertEqual(st, "far")
        self.assertGreater(dist, 50)
        self.assertEqual(field_api._geo_flag(blk, None, None), ("missing", None))      # khong toa do
        self.assertEqual(field_api._geo_flag("B FLD", 11.94, 108.458), ("missing", None))  # lo khong co boundary

    def test_complete_task_photo_meta_geo_ok(self):
        frappe.set_user(self.leader)
        blk = self._mk_block_with_boundary()
        t = frappe.get_doc({"doctype": "Farm Task", "title": "Tưới", "block": blk, "crop": "Gấc",
                            "task_date": "2026-06-14", "status": "pending", "require_photo": 1,
                            "team_leader": self.leader}).insert(ignore_permissions=True)
        meta = [{"lat": 11.9400, "lng": 108.4580, "accuracy": 8,
                 "capturedAt": "2026-06-19 08:00:00", "inApp": True}]
        field_api.complete_task(t.name, client_uuid="g1", photos=[self._PNG_1PX], photo_meta=meta)
        row = frappe.get_doc("Farm Task", t.name).photos[0]
        self.assertEqual(row.gps_status, "ok")
        self.assertEqual(row.in_app, 1)
        self.assertAlmostEqual(row.lat, 11.9400, places=4)

    def test_complete_task_photo_missing_gps(self):
        frappe.set_user(self.leader)
        field_api.complete_task(self.t.name, client_uuid="g2", photos=[self._PNG_1PX], photo_meta=[])
        row = frappe.get_doc("Farm Task", self.t.name).photos[0]
        self.assertEqual(row.gps_status, "missing")
        self.assertEqual(row.in_app, 0)

    def test_admin_task_photos_returns_meta(self):
        from akf_farm.api import admin_api
        frappe.set_user(self.leader)
        blk = self._mk_block_with_boundary()
        t = frappe.get_doc({"doctype": "Farm Task", "title": "Tưới", "block": blk, "crop": "Gấc",
                            "task_date": "2026-06-14", "status": "pending", "require_photo": 1,
                            "team_leader": self.leader}).insert(ignore_permissions=True)
        field_api.complete_task(t.name, client_uuid="ap1", photos=[self._PNG_1PX],
                                photo_meta=[{"lat": 11.94, "lng": 108.458, "inApp": True}])
        frappe.set_user("Administrator")
        rows = admin_api.task_photos(t.name)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["gpsStatus"], "ok")
        self.assertTrue(rows[0]["inApp"])
        self.assertTrue(rows[0]["url"].startswith("/private/files/"))
