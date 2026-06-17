import frappe
from frappe.tests.utils import FrappeTestCase


class TestExplicitFields(FrappeTestCase):
    def test_step_offset_default_zero_and_prereq_field(self):
        if frappe.db.exists("Cultivation Process", "QT F2"):
            frappe.delete_doc("Cultivation Process", "QT F2", force=True)
        p = frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "QT F2", "crop": "Gấc",
            "cycle_length_days": 1095,
            "steps": [{"step": 1, "description": "X", "frequency_type": "one_time"}],
        }).insert()
        self.assertEqual(p.steps[0].offset_days, 0)
        self.assertEqual(p.cycle_length_days, 1095)
        self.assertTrue(frappe.get_meta("Cultivation Step").has_field("prerequisite"))
        self.assertTrue(frappe.get_meta("Farm Task").has_field("completed_on"))
