import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import getdate, add_days
from akf_farm.engine.task_generator import generate_tasks


def _proc(name, steps):
    if frappe.db.exists("Cultivation Process", name):
        frappe.delete_doc("Cultivation Process", name, force=True)
    frappe.get_doc({"doctype": "Cultivation Process", "process_name": name, "crop": "Gấc", "steps": steps}).insert()


def _block(name):
    if not frappe.db.exists("Farm Zone", "Z PH"):
        frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z PH", "area": 10000}).insert()
    if not frappe.db.exists("Farm Block", name):
        frappe.get_doc({"doctype": "Farm Block", "block_name": name, "zone": "Z PH", "area": 10000}).insert()


def _cycle(block, process):
    return frappe.get_doc({"doctype": "Crop Cycle", "block": block, "crop": "Gấc",
                           "cultivation_process": process, "start_date": str(getdate()),
                           "status": "active"}).insert().name


def _has_task(cycle, title, date):
    return bool(frappe.db.exists("Farm Task", {"cycle": cycle, "title": title, "task_date": str(date)}))


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


class TestPhasedGeneration(FrappeTestCase):
    def test_maintenance_gated_until_setup_done(self):
        _proc("QT GATE", [
            {"step": 1, "description": "Gieo GATE", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Tưới GATE", "frequency_type": "daily", "scope": "per_crop"},
        ])
        _block("B GATE")
        name = _cycle("B GATE", "QT GATE")  # hook after_insert -> generate
        today = getdate()
        self.assertTrue(_has_task(name, "Gieo GATE", today))      # setup có
        self.assertFalse(_has_task(name, "Tưới GATE", today))      # bảo trì chưa
        # hoàn thành việc setup
        gieo = frappe.get_all("Farm Task", filters={"cycle": name, "title": "Gieo GATE"})[0].name
        frappe.db.set_value("Farm Task", gieo, "status", "completed")
        generate_tasks()
        self.assertTrue(frappe.db.get_value("Crop Cycle", name, "setup_done_on"))
        self.assertTrue(_has_task(name, "Tưới GATE", today))       # bảo trì sinh từ hôm nay

    def test_offset_step_anchored_start_plus_offset(self):
        _proc("QT OFF", [
            {"step": 1, "description": "Gieo OFF", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Bón OFF", "frequency_type": "daily", "scope": "per_crop", "offset_days": 3},
        ])
        _block("B OFF")
        name = _cycle("B OFF", "QT OFF")
        today = getdate()
        # offset=3 -> không có ngày hôm nay, có ngày +3 (bất kể setup)
        self.assertFalse(_has_task(name, "Bón OFF", today))
        self.assertTrue(_has_task(name, "Bón OFF", add_days(today, 3)))

    def test_empty_setup_maintenance_from_start(self):
        _proc("QT NOSETUP", [
            {"step": 1, "description": "Tưới NOSETUP", "frequency_type": "daily", "scope": "per_crop"},
        ])
        _block("B NOSETUP")
        name = _cycle("B NOSETUP", "QT NOSETUP")
        self.assertTrue(_has_task(name, "Tưới NOSETUP", getdate()))  # bảo trì từ ngày gieo
