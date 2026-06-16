import frappe
from frappe.tests.utils import FrappeTestCase


class TestFarmBlock(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Vùng Block Test"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Vùng Block Test", "area": 50000}).insert()

    def test_create_block_in_zone(self):
        b = frappe.get_doc({
            "doctype": "Farm Block", "block_name": "Lô BT1",
            "zone": "Vùng Block Test", "area": 12500, "status": "good",
        }).insert()
        self.assertEqual(frappe.get_doc("Farm Block", b.name).zone, "Vùng Block Test")

    def test_reject_non_positive_area(self):
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "Lô BT0",
                            "zone": "Vùng Block Test", "area": 0}).insert()
