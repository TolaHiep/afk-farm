import frappe
from frappe.tests.utils import FrappeTestCase


class TestFarmZone(FrappeTestCase):
    def test_create_zone_with_area_and_boundary(self):
        z = frappe.get_doc({
            "doctype": "Farm Zone",
            "zone_name": "Vùng A Test",
            "area": 50000,
            "boundary": '{"type":"Polygon","coordinates":[]}',
        }).insert()
        again = frappe.get_doc("Farm Zone", z.name)
        self.assertEqual(again.area, 50000)

    def test_reject_non_positive_area(self):
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Zero Area", "area": 0}).insert()
