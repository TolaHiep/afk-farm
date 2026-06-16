import frappe
from frappe.model.document import Document


class CropCycle(Document):
    def validate(self):
        if self.status == "active":
            dup = frappe.db.exists("Crop Cycle", {
                "block": self.block, "crop": self.crop, "status": "active",
                "name": ("!=", self.name or ""),
            })
            if dup:
                frappe.throw(f"Lô {self.block} đã có chu kỳ {self.crop} đang hoạt động")
