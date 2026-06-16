import frappe
from frappe.model.document import Document


class FarmBlock(Document):
    def validate(self):
        if not self.area or self.area <= 0:
            frappe.throw("Diện tích lô phải lớn hơn 0")
        # Cảnh báo (không chặn) nếu tổng diện tích lô vượt diện tích vùng
        zone_area = frappe.db.get_value("Farm Zone", self.zone, "area") or 0
        total = frappe.db.sql(
            "select coalesce(sum(area),0) from `tabFarm Block` where zone=%s and name!=%s",
            (self.zone, self.name or ""),
        )[0][0]
        if zone_area and total + (self.area or 0) > zone_area:
            frappe.msgprint("Tổng diện tích lô vượt diện tích vùng", indicator="orange")
