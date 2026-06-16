import frappe
from frappe.model.document import Document


class FarmZone(Document):
    def validate(self):
        if not self.area or self.area <= 0:
            frappe.throw("Diện tích vùng phải lớn hơn 0")
