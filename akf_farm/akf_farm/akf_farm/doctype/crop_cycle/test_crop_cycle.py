import frappe
from frappe.tests.utils import FrappeTestCase


class TestCropCycle(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Vùng CC"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Vùng CC", "area": 50000}).insert()
        if not frappe.db.exists("Farm Block", "Lô CC1"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "Lô CC1", "zone": "Vùng CC", "area": 10000}).insert()
        # Dọn cycle cũ để mỗi test chạy trên trạng thái sạch (tránh lẫn dữ liệu giữa các test)
        frappe.db.delete("Crop Cycle", {"block": "Lô CC1"})

    def _mk(self, crop):
        return frappe.get_doc({"doctype": "Crop Cycle", "block": "Lô CC1", "crop": crop,
                               "start_date": "2026-05-01", "status": "active"}).insert()

    def test_two_crops_active_ok(self):
        self._mk("Gấc")
        self._mk("Sâm")
        self.assertEqual(frappe.db.count("Crop Cycle", {"block": "Lô CC1", "status": "active"}), 2)

    def test_block_same_crop_twice_active_rejected(self):
        self._mk("Gấc")
        with self.assertRaises(frappe.ValidationError):
            self._mk("Gấc")
