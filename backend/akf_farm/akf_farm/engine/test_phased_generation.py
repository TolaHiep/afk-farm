import frappe
from frappe.tests.utils import FrappeTestCase


class TestPhasedFields(FrappeTestCase):
    def test_step_offset_default_minus_one(self):
        if frappe.db.exists("Cultivation Process", "QT FIELD"):
            frappe.delete_doc("Cultivation Process", "QT FIELD", force=True)
        p = frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "QT FIELD", "crop": "Gấc",
            "steps": [{"step": 1, "description": "X", "frequency_type": "one_time"}],
        }).insert()
        self.assertEqual(p.steps[0].offset_days, -1)

    def test_crop_cycle_has_setup_done_on(self):
        self.assertTrue(frappe.get_meta("Crop Cycle").has_field("setup_done_on"))
