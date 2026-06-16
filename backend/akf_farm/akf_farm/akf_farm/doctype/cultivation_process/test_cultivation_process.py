import frappe
from frappe.tests.utils import FrappeTestCase


class TestCultivationProcess(FrappeTestCase):
    def test_process_with_steps(self):
        p = frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "Quy trình Gấc test", "crop": "Gấc",
            "steps": [
                {"step": 1, "description": "Chuẩn bị đất", "mandays_per_ha": 10,
                 "frequency_type": "one_time", "frequency_value": 1, "scope": "shared", "require_photo": 1},
                {"step": 2, "description": "Tưới nước", "mandays_per_ha": 2,
                 "frequency_type": "every_n_days", "frequency_value": 2, "scope": "per_crop", "require_photo": 0},
            ],
        }).insert()
        self.assertEqual(len(frappe.get_doc("Cultivation Process", p.name).steps), 2)
