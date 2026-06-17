import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.engine.task_generator import generate_tasks


class TestGenerate(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z GEN"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z GEN", "area": 50000}).insert()
        if not frappe.db.exists("Farm Block", "B GEN"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B GEN", "zone": "Z GEN", "area": 10000}).insert()
        if not frappe.db.exists("Cultivation Process", "P GEN"):
            frappe.get_doc({"doctype": "Cultivation Process", "process_name": "P GEN", "crop": "Gấc",
                "steps": [{"step": 1, "description": "Tưới", "mandays_per_ha": 2,
                           "frequency_type": "n_per_period", "frequency_value": 2, "scope": "per_crop"}]}).insert()
        # Dọn để chạy sạch
        frappe.db.delete("Farm Task", {"block": "B GEN"})
        frappe.db.delete("Crop Cycle", {"block": "B GEN"})
        frappe.get_doc({"doctype": "Crop Cycle", "block": "B GEN", "crop": "Gấc",
                        "cultivation_process": "P GEN", "start_date": "2026-06-14", "status": "active"}).insert()

    def test_generate_and_idempotent(self):
        n1 = generate_tasks(from_date="2026-06-14", days=10)
        cnt1 = frappe.db.count("Farm Task", {"block": "B GEN"})
        generate_tasks(from_date="2026-06-14", days=10)  # chạy lại
        cnt2 = frappe.db.count("Farm Task", {"block": "B GEN"})
        self.assertGreater(n1, 0)
        self.assertEqual(cnt1, cnt2)  # không tạo trùng
