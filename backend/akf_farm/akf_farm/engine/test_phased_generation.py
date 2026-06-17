import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import getdate, add_days
from akf_farm.engine.task_generator import generate_tasks


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


def _proc(name, steps, cycle_length=0):
    if frappe.db.exists("Cultivation Process", name):
        frappe.delete_doc("Cultivation Process", name, force=True)
    frappe.get_doc({"doctype": "Cultivation Process", "process_name": name, "crop": "Gấc",
                    "cycle_length_days": cycle_length, "steps": steps}).insert()


def _block(name):
    if not frappe.db.exists("Farm Zone", "Z EX"):
        frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z EX", "area": 10000}).insert()
    if not frappe.db.exists("Farm Block", name):
        frappe.get_doc({"doctype": "Farm Block", "block_name": name, "zone": "Z EX", "area": 10000}).insert()


def _cycle(block, process, crop="Gấc"):
    return frappe.get_doc({"doctype": "Crop Cycle", "block": block, "crop": crop,
                           "cultivation_process": process, "start_date": str(getdate()),
                           "status": "active"}).insert().name


def _has(cycle, title, date):
    return bool(frappe.db.exists("Farm Task", {"cycle": cycle, "title": title, "task_date": str(date)}))


class TestExplicitGeneration(FrappeTestCase):
    def test_no_prereq_offset(self):
        _proc("QT NP", [
            {"step": 1, "description": "Ngay NP", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Sau3 NP", "frequency_type": "one_time", "scope": "per_crop", "offset_days": 3},
        ])
        _block("B NP")
        name = _cycle("B NP", "QT NP")
        today = getdate()
        self.assertTrue(_has(name, "Ngay NP", today))
        self.assertFalse(_has(name, "Sau3 NP", today))
        self.assertTrue(_has(name, "Sau3 NP", add_days(today, 3)))

    def test_prereq_gates_and_anchors(self):
        _proc("QT PR", [
            {"step": 1, "description": "Gieo PR", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Tưới PR", "frequency_type": "daily", "scope": "per_crop",
             "prerequisite": "Gieo PR"},
        ])
        _block("B PR")
        name = _cycle("B PR", "QT PR")
        today = getdate()
        self.assertFalse(_has(name, "Tưới PR", today))  # prereq chưa xong
        gieo = frappe.get_all("Farm Task", filters={"cycle": name, "title": "Gieo PR"})[0].name
        frappe.db.set_value("Farm Task", gieo, {"status": "completed", "completed_on": str(today)})
        generate_tasks()
        self.assertTrue(_has(name, "Tưới PR", today))  # neo từ completed_on

    def test_cycle_length_stops_recurring(self):
        _proc("QT CL", [
            {"step": 1, "description": "Lặp CL", "frequency_type": "daily", "scope": "per_crop"},
        ], cycle_length=2)
        _block("B CL")
        name = _cycle("B CL", "QT CL")
        today = getdate()
        self.assertTrue(_has(name, "Lặp CL", today))
        self.assertTrue(_has(name, "Lặp CL", add_days(today, 2)))
        self.assertFalse(_has(name, "Lặp CL", add_days(today, 5)))  # vượt cycle_length=2

    def test_per_crop_keyed_by_cycle(self):
        # chu kỳ cũ đóng + chu kỳ mới cùng lô/cây: task chu kỳ mới KHÔNG bị khử trùng nhầm
        _proc("QT CY", [{"step": 1, "description": "Việc CY", "frequency_type": "one_time", "scope": "per_crop"}])
        _block("B CY")
        old = _cycle("B CY", "QT CY")
        frappe.db.set_value("Crop Cycle", old, "status", "closed")
        new = _cycle("B CY", "QT CY")
        generate_tasks()
        self.assertTrue(_has(new, "Việc CY", getdate()))  # task gắn đúng chu kỳ mới

    def test_shared_merged_per_block(self):
        _proc("QT SH", [{"step": 1, "description": "Họp SH", "frequency_type": "one_time", "scope": "shared"}])
        _block("B SH")
        g = _cycle("B SH", "QT SH", crop="Gấc")
        # tạo thêm cây Sâm cùng lô (cần process Sâm)
        _proc_s = "QT SH S"
        if frappe.db.exists("Cultivation Process", _proc_s):
            frappe.delete_doc("Cultivation Process", _proc_s, force=True)
        frappe.get_doc({"doctype": "Cultivation Process", "process_name": _proc_s, "crop": "Sâm",
                        "steps": [{"step": 1, "description": "Họp SH", "frequency_type": "one_time", "scope": "shared"}]}).insert()
        frappe.get_doc({"doctype": "Crop Cycle", "block": "B SH", "crop": "Sâm",
                        "cultivation_process": _proc_s, "start_date": str(getdate()), "status": "active"}).insert()
        generate_tasks()
        cnt = frappe.db.count("Farm Task", {"block": "B SH", "title": "Họp SH", "task_date": str(getdate())})
        self.assertEqual(cnt, 1)  # gộp 1 task/lô dù 2 cây
