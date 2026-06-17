import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import admin_api

SQUARE = '{"type":"Polygon","coordinates":[[[0,0],[0,0.01],[0.01,0.01],[0.01,0],[0,0]]]}'


class TestPlotCrops(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z SPLIT"):
            admin_api.create_zone(zone_name="Z SPLIT", area=100000, boundary=SQUARE)

    def test_create_plot_with_crops_list(self):
        p = admin_api.create_plot(block_name="BC1", zone="Z SPLIT", area=1000, crops=["Gấc", "Sâm"])
        self.assertEqual(p["cropTags"], ["Gấc", "Sâm"])
        self.assertEqual(frappe.db.get_value("Farm Block", "BC1", "crops"), "Gấc,Sâm")

    def test_update_plot_crops(self):
        admin_api.create_plot(block_name="BC2", zone="Z SPLIT", area=1000)
        admin_api.update_plot("BC2", crops="Gấc")
        self.assertEqual(admin_api.get_plot("BC2")["cropTags"], ["Gấc"])

    def test_no_crops_returns_empty_tags(self):
        admin_api.create_plot(block_name="BC3", zone="Z SPLIT", area=1000)
        self.assertEqual(admin_api.get_plot("BC3")["cropTags"], [])
