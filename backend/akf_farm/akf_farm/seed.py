import frappe
from akf_farm.install import ensure_roles
from akf_farm.engine.task_generator import generate_tasks
from akf_farm.api.sheet_import import import_from_markdown

LEADERS = [
    ("vana@akf.local", "Nguyễn Văn A", "0901234567"),
    ("thib@akf.local", "Trần Thị B", "0902345678"),
]
ZONES = [("Vùng A", 50000, "good"), ("Vùng B", 45000, "warning")]
BLOCKS = [
    ("Lô A1", "Vùng A", "vana@akf.local"),
    ("Lô A2", "Vùng A", "vana@akf.local"),
    ("Lô B1", "Vùng B", "thib@akf.local"),
    ("Lô B2", "Vùng B", "thib@akf.local"),
]


def run(start_date="2026-06-14"):
    """Nạp dữ liệu mẫu (idempotent) + sinh việc 10 ngày. Chạy: bench execute akf_farm.seed.run"""
    ensure_roles()

    for zn, area, status in ZONES:
        if not frappe.db.exists("Farm Zone", zn):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": zn, "area": area, "status": status}).insert()

    for email, name, phone in LEADERS:
        if not frappe.db.exists("User", email):
            frappe.get_doc({
                "doctype": "User", "email": email, "first_name": name, "username": phone,
                "new_password": "Akf@Farm2026", "send_welcome_email": 0,
                "roles": [{"role": "AKF Team Leader"}],
            }).insert(ignore_permissions=True)

    for bn, zn, tl in BLOCKS:
        if not frappe.db.exists("Farm Block", bn):
            frappe.get_doc({"doctype": "Farm Block", "block_name": bn, "zone": zn,
                            "area": 12500, "team_leader": tl, "status": "good"}).insert()

    # Quy trình THẬT từ docs/quy-trinh-canh-tac.md (Sâm 22 bước + Gấc 22 bước)
    import_from_markdown()

    # Mô hình xen canh: mỗi lô trồng đồng thời Gấc (giàn) + Sâm (dưới tán)
    for bn, zn, tl in BLOCKS:
        for crop in ("Gấc", "Sâm"):
            if not frappe.db.exists("Crop Cycle", {"block": bn, "crop": crop}):
                frappe.get_doc({"doctype": "Crop Cycle", "block": bn, "crop": crop,
                                "cultivation_process": f"Quy trình {crop}", "start_date": start_date,
                                "status": "active"}).insert()

    frappe.db.commit()
    created = generate_tasks(from_date=start_date, days=10)
    frappe.db.commit()
    print(f"Seed xong. Sinh {created} farm task.")
    return created
