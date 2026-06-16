import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import admin_api


class TestCrud(FrappeTestCase):
    def test_zone_crud(self):
        z = admin_api.create_zone(zone_name="Z CRUD", area=30000)
        self.assertEqual(z["id"], "Z CRUD")
        admin_api.update_zone("Z CRUD", status="warning")
        self.assertEqual(frappe.db.get_value("Farm Zone", "Z CRUD", "status"), "warning")
        admin_api.delete_zone("Z CRUD")
        self.assertFalse(frappe.db.exists("Farm Zone", "Z CRUD"))

    def test_plot_crud(self):
        if not frappe.db.exists("Farm Zone", "Z CRUD2"):
            admin_api.create_zone(zone_name="Z CRUD2", area=30000)
        p = admin_api.create_plot(block_name="B CRUD", zone="Z CRUD2", area=10000)
        self.assertEqual(p["id"], "B CRUD")
        self.assertEqual(p["zoneId"], "Z CRUD2")
        admin_api.update_plot("B CRUD", status="danger")
        self.assertEqual(frappe.db.get_value("Farm Block", "B CRUD", "status"), "danger")
        admin_api.delete_plot("B CRUD")
        self.assertFalse(frappe.db.exists("Farm Block", "B CRUD"))
