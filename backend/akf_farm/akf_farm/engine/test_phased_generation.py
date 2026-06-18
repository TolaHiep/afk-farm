import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import getdate, add_days
from akf_farm.engine.task_generator import generate_tasks
from akf_farm.api import field_api
from akf_farm.api import admin_api


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

    def test_prereq_forecast_anchored(self):
        _proc("QT PR", [
            {"step": 1, "description": "Gieo PR", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Tưới PR", "frequency_type": "daily", "scope": "per_crop",
             "prerequisite": "Gieo PR"},
        ])
        _block("B PR")
        name = _cycle("B PR", "QT PR")
        today = getdate()
        # forecast: Gieo hôm nay; Tưới bắt đầu ngày mai (Gieo est=1 -> finish hôm nay, +1)
        self.assertTrue(_has(name, "Gieo PR", today))
        self.assertFalse(_has(name, "Tưới PR", today))
        self.assertTrue(_has(name, "Tưới PR", add_days(today, 1)))

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


class TestProcessApi(FrappeTestCase):
    def test_create_list_offset_prereq_cyclelen(self):
        if frappe.db.exists("Cultivation Process", "QT API2"):
            frappe.delete_doc("Cultivation Process", "QT API2", force=True)
        admin_api.create_process(process_name="QT API2", crop="Gấc", cycle_length_days=1095, steps=[
            {"description": "Gieo", "frequencyType": "one_time", "scopeRaw": "per_crop"},
            {"description": "Tưới", "frequencyType": "daily", "scopeRaw": "per_crop",
             "offsetDays": 2, "prerequisite": "Gieo"},
        ])
        doc = frappe.get_doc("Cultivation Process", "QT API2")
        self.assertEqual(doc.cycle_length_days, 1095)
        self.assertEqual(doc.steps[0].offset_days, 0)
        self.assertEqual(doc.steps[1].offset_days, 2)
        self.assertEqual(doc.steps[1].prerequisite, "Gieo")
        listed = [p for p in admin_api.list_processes() if p["id"] == "QT API2"][0]
        self.assertEqual(listed["cycleLengthDays"], 1095)
        self.assertEqual(listed["steps"][1]["offsetDays"], 2)
        self.assertEqual(listed["steps"][1]["prerequisite"], "Gieo")


class TestCompleteSetsCompletedOn(FrappeTestCase):
    def test_complete_sets_completed_on(self):
        _proc("QT CT", [
            {"step": 1, "description": "Gieo CT", "frequency_type": "one_time", "scope": "per_crop"},
        ])
        _block("B CT")
        name = _cycle("B CT", "QT CT")
        today = getdate()
        gieo = frappe.get_all("Farm Task", filters={"cycle": name, "title": "Gieo CT"})[0].name
        field_api.complete_task(gieo)
        self.assertEqual(str(frappe.db.get_value("Farm Task", gieo, "completed_on")), str(today))



class TestGenerateScopedToCycle(FrappeTestCase):
    def test_scoped_generation_only_touches_one_cycle(self):
        _proc("QT SC", [{"step": 1, "description": "Lặp SC", "frequency_type": "daily", "scope": "per_crop"}])
        _block("B SC1")
        _block("B SC2")
        a = _cycle("B SC1", "QT SC")
        b = _cycle("B SC2", "QT SC")
        today = getdate()
        # xóa task hôm nay của chu kỳ B
        for t in frappe.get_all("Farm Task", filters={"cycle": b, "title": "Lặp SC", "task_date": str(today)}):
            frappe.delete_doc("Farm Task", t.name, force=True)
        # sinh phạm vi CHỈ chu kỳ A -> B không được tái sinh
        generate_tasks(cycle=a)
        self.assertFalse(_has(b, "Lặp SC", today))
        # sinh toàn bộ -> B tái sinh
        generate_tasks()
        self.assertTrue(_has(b, "Lặp SC", today))


class TestSetupDoneOnRemoved(FrappeTestCase):
    def test_setup_done_on_field_removed(self):
        self.assertFalse(frappe.get_meta("Crop Cycle").has_field("setup_done_on"))


class TestNPerPeriodGeneration(FrappeTestCase):
    def test_two_per_day_makes_two_tasks(self):
        _proc("QT 2D", [
            {"step": 1, "description": "Tưới 2D", "frequency_type": "n_per_period",
             "frequency_value": 1, "times_per_period": 2, "scope": "per_crop"},
        ])
        _block("B 2D")
        name = _cycle("B 2D", "QT 2D")
        today = getdate()
        self.assertTrue(_has(name, "Tưới 2D (lần 1/2)", today))
        self.assertTrue(_has(name, "Tưới 2D (lần 2/2)", today))
        self.assertFalse(_has(name, "Tưới 2D", today))  # không có task không hậu tố

    def test_every_n_days_single_task(self):
        _proc("QT 3N", [
            {"step": 1, "description": "Bón 3N", "frequency_type": "n_per_period",
             "frequency_value": 3, "times_per_period": 1, "scope": "per_crop"},
        ])
        _block("B 3N")
        name = _cycle("B 3N", "QT 3N")
        today = getdate()
        self.assertTrue(_has(name, "Bón 3N", today))            # X=1 -> không hậu tố
        self.assertFalse(_has(name, "Bón 3N", add_days(today, 1)))
        self.assertTrue(_has(name, "Bón 3N", add_days(today, 3)))  # mỗi 3 ngày


class TestFreqApi(FrappeTestCase):
    def test_create_list_times_per_period(self):
        if frappe.db.exists("Cultivation Process", "QT FAPI"):
            frappe.delete_doc("Cultivation Process", "QT FAPI", force=True)
        admin_api.create_process(process_name="QT FAPI", crop="Gấc", steps=[
            {"description": "Tưới", "frequencyType": "n_per_period", "frequencyValue": 1,
             "timesPerPeriod": 2, "scopeRaw": "per_crop"},
        ])
        doc = frappe.get_doc("Cultivation Process", "QT FAPI")
        self.assertEqual(doc.steps[0].times_per_period, 2)
        listed = [p for p in admin_api.list_processes() if p["id"] == "QT FAPI"][0]
        self.assertEqual(listed["steps"][0]["timesPerPeriod"], 2)
        self.assertEqual(listed["steps"][0]["frequency"], "2 lần / 1 ngày")


class TestFreqFields(FrappeTestCase):
    def test_times_per_period_field_and_default(self):
        if frappe.db.exists("Cultivation Process", "QT TPP"):
            frappe.delete_doc("Cultivation Process", "QT TPP", force=True)
        p = frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "QT TPP", "crop": "Gấc",
            "steps": [
                {"step": 1, "description": "A", "frequency_type": "daily"},
                {"step": 2, "description": "B", "frequency_type": "n_per_period",
                 "frequency_value": 1, "times_per_period": 2},
            ],
        }).insert()
        self.assertEqual(p.steps[0].times_per_period, 1)   # default
        self.assertEqual(p.steps[1].times_per_period, 2)
        self.assertEqual(p.steps[1].frequency_type, "n_per_period")


class TestEstimatedDaysField(FrappeTestCase):
    def test_estimated_days_default_and_store(self):
        if frappe.db.exists("Cultivation Process", "QT ED"):
            frappe.delete_doc("Cultivation Process", "QT ED", force=True)
        p = frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "QT ED", "crop": "Gấc",
            "steps": [
                {"step": 1, "description": "A", "frequency_type": "daily"},
                {"step": 2, "description": "B", "frequency_type": "one_time", "estimated_days": 3},
            ],
        }).insert()
        self.assertEqual(p.steps[0].estimated_days, 1)
        self.assertEqual(p.steps[1].estimated_days, 3)


class TestEstimatedApi(FrappeTestCase):
    def test_create_list_estimated_days(self):
        if frappe.db.exists("Cultivation Process", "QT EDAPI"):
            frappe.delete_doc("Cultivation Process", "QT EDAPI", force=True)
        admin_api.create_process(process_name="QT EDAPI", crop="Gấc", steps=[
            {"description": "Ngâm ủ", "frequencyType": "one_time", "scopeRaw": "per_crop", "estimatedDays": 3},
            {"description": "Tưới", "frequencyType": "daily", "scopeRaw": "per_crop"},
        ])
        doc = frappe.get_doc("Cultivation Process", "QT EDAPI")
        self.assertEqual(doc.steps[0].estimated_days, 3)
        self.assertEqual(doc.steps[1].estimated_days, 1)
        listed = [p for p in admin_api.list_processes() if p["id"] == "QT EDAPI"][0]
        self.assertEqual(listed["steps"][0]["estimatedDays"], 3)
        self.assertEqual(listed["steps"][1]["estimatedDays"], 1)
