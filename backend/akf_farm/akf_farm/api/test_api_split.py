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


class TestPlotsBulk(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z BULK"):
            admin_api.create_zone(zone_name="Z BULK", area=100000, boundary=SQUARE)

    def test_create_plots_bulk(self):
        plots = [
            {"block_name": "BK1", "area": 500, "boundary": SQUARE, "crops": ["Gấc"]},
            {"block_name": "BK2", "area": 500, "boundary": SQUARE, "crops": ["Gấc", "Sâm"]},
        ]
        out = admin_api.create_plots_bulk(zone="Z BULK", plots=plots)
        self.assertEqual(len(out), 2)
        self.assertEqual(out[1]["cropTags"], ["Gấc", "Sâm"])
        self.assertTrue(frappe.db.exists("Farm Block", "BK1"))
        self.assertEqual(frappe.db.get_value("Farm Block", "BK1", "zone"), "Z BULK")

    def test_bulk_applies_team_leader_to_all(self):
        plots = [{"block_name": "BKT1", "area": 500, "boundary": SQUARE}]
        out = admin_api.create_plots_bulk(zone="Z BULK", plots=plots, team_leader="Administrator")
        self.assertEqual(out[0]["teamLeaderId"], "Administrator")

    def test_bulk_duplicate_name_raises(self):
        admin_api.create_plot(block_name="DUP", zone="Z BULK", area=100)
        with self.assertRaises(frappe.exceptions.DuplicateEntryError):
            admin_api.create_plots_bulk(zone="Z BULK", plots=[{"block_name": "DUP", "area": 1, "boundary": SQUARE}])
