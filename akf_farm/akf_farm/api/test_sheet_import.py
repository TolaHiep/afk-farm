import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api.sheet_import import import_rows


class TestSheetImport(FrappeTestCase):
    def test_import_creates_process(self):
        if frappe.db.exists("Cultivation Process", "Quy trình Sâm IMP"):
            frappe.delete_doc("Cultivation Process", "Quy trình Sâm IMP")
        rows = [
            {"Bước": 1, "Mô tả": "Chuẩn bị đất", "Công/ha": 10, "Tần suất": "1 lần/chu kỳ", "Phạm vi": "Dùng chung"},
            {"Bước": 2, "Mô tả": "Tưới nước", "Công/ha": 2, "Tần suất": "2 ngày/lần", "Phạm vi": "Theo cây"},
        ]
        name = import_rows("Quy trình Sâm IMP", "Sâm", rows)
        doc = frappe.get_doc("Cultivation Process", name)
        self.assertEqual(len(doc.steps), 2)
        self.assertEqual(doc.steps[0].scope, "shared")
        self.assertEqual(doc.steps[1].frequency_type, "every_n_days")
