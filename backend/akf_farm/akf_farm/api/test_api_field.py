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
        r = field_api.submit_support(block="B FLD", type="Khác", content="cần giúp", photos=[self._PNG_1PX])
        doc = frappe.get_doc("Support Request", r["name"])
        self.assertEqual(len(doc.photos), 1)
        self.assertTrue(doc.photos[0].image.startswith("/private/files/"))
        self.assertEqual(self._file_count("Support Request", r["name"]), 1)
