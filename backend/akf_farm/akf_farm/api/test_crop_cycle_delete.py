import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import getdate
from akf_farm.api import admin_api


class TestDeleteCropCycle(FrappeTestCase):
    """Xoá chu kỳ: chưa có việc hoàn thành -> xoá hẳn; đã có việc hoàn thành -> đóng + giữ lịch sử."""

    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z DEL"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z DEL", "area": 10000}).insert()
        if frappe.db.exists("Cultivation Process", "QT DEL"):
            frappe.delete_doc("Cultivation Process", "QT DEL", force=True)
        frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "QT DEL", "crop": "Gấc",
            "steps": [{"step": 1, "description": "Việc DEL", "frequency_type": "daily",
                       "frequency_value": 1, "scope": "per_crop"}],
        }).insert()

    def _make_cycle(self, block):
        # mỗi test dùng block riêng (ràng buộc: 1 lô + 1 cây chỉ 1 chu kỳ active)
        if not frappe.db.exists("Farm Block", block):
            frappe.get_doc({"doctype": "Farm Block", "block_name": block,
                            "zone": "Z DEL", "area": 10000}).insert()
        # after_insert hook tự sinh task cho cửa sổ 10 ngày
        return frappe.get_doc({
            "doctype": "Crop Cycle", "block": block, "crop": "Gấc",
            "cultivation_process": "QT DEL", "start_date": str(getdate()), "status": "active",
        }).insert().name

    def test_delete_when_no_completed_removes_cycle_and_tasks(self):
        name = self._make_cycle("B DEL NONE")
        self.assertTrue(frappe.get_all("Farm Task", filters={"cycle": name}))  # có task chưa xong
        res = admin_api.delete_crop_cycle(name)
        self.assertEqual(res["deleted"], True)
        self.assertFalse(frappe.db.exists("Crop Cycle", name))
        self.assertEqual(frappe.get_all("Farm Task", filters={"cycle": name}), [])

    def test_delete_with_completed_closes_cycle_and_keeps_history(self):
        name = self._make_cycle("B DEL DONE")
        tasks = frappe.get_all("Farm Task", filters={"cycle": name}, fields=["name"])
        # đánh dấu 1 việc đã hoàn thành (lịch sử sản xuất)
        frappe.db.set_value("Farm Task", tasks[0].name, "status", "completed")
        res = admin_api.delete_crop_cycle(name)
        self.assertEqual(res["closed"], True)
        self.assertTrue(frappe.db.exists("Crop Cycle", name))
        self.assertEqual(frappe.db.get_value("Crop Cycle", name, "status"), "closed")
        # việc đã hoàn thành còn, việc chưa xong bị gỡ
        self.assertTrue(frappe.db.exists("Farm Task", tasks[0].name))
        remaining = frappe.get_all("Farm Task", filters={"cycle": name}, fields=["status"])
        self.assertTrue(all(t.status == "completed" for t in remaining))
