import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import getdate


class TestCropCycleAutogen(FrappeTestCase):
    """Tạo Crop Cycle (bắt đầu trồng) phải tự sinh Farm Task ngay qua hook after_insert."""

    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z AUTOGEN"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z AUTOGEN", "area": 10000}).insert()
        if not frappe.db.exists("Farm Block", "B AUTOGEN"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B AUTOGEN",
                            "zone": "Z AUTOGEN", "area": 10000}).insert()
        if frappe.db.exists("Cultivation Process", "QT AUTOGEN"):
            frappe.delete_doc("Cultivation Process", "QT AUTOGEN", force=True)
        frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "QT AUTOGEN", "crop": "Gấc",
            "steps": [{"step": 1, "description": "Xuống giống AUTOGEN",
                       "frequency_type": "one_time", "frequency_value": 1, "scope": "per_crop"}],
        }).insert()

    def test_creating_cycle_generates_tasks(self):
        today = str(getdate())
        frappe.get_doc({
            "doctype": "Crop Cycle", "block": "B AUTOGEN", "crop": "Gấc",
            "cultivation_process": "QT AUTOGEN", "start_date": today, "status": "active",
        }).insert()
        # Hook after_insert -> generate_tasks -> việc "Xuống giống" của ngày bắt đầu phải có
        self.assertTrue(frappe.db.exists("Farm Task", {
            "block": "B AUTOGEN", "title": "Xuống giống AUTOGEN", "task_date": today,
        }))
