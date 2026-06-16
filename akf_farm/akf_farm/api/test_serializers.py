import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api.serializers import serialize_plot


class TestSerializers(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z SER"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z SER", "area": 50000}).insert()
        if not frappe.db.exists("Farm Block", "B SER"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B SER", "zone": "Z SER",
                            "area": 12500, "status": "good"}).insert()

    def test_plot_shape_matches_frontend(self):
        p = serialize_plot("B SER")
        for key in ("id", "name", "zoneId", "area", "status", "crops", "teamLeaderId"):
            self.assertIn(key, p)
        self.assertIsInstance(p["crops"], list)

    def test_plot_crops_reflect_active_cycles(self):
        for crop in ("Gấc", "Sâm"):
            if not frappe.db.exists("Crop Cycle", {"block": "B SER", "crop": crop, "status": "active"}):
                frappe.get_doc({"doctype": "Crop Cycle", "block": "B SER", "crop": crop,
                                "start_date": "2026-06-01", "status": "active"}).insert()
        p = serialize_plot("B SER")
        crops = {c["crop"] for c in p["crops"]}
        self.assertEqual(crops, {"Gấc", "Sâm"})
