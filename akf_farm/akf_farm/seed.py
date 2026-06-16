import frappe
from akf_farm.install import ensure_roles
from akf_farm.engine.task_generator import generate_tasks

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

    if not frappe.db.exists("Cultivation Process", "Quy trình Gấc"):
        frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "Quy trình Gấc", "crop": "Gấc",
            "steps": [
                {"step": 1, "description": "Tưới nước giàn gấc", "mandays_per_ha": 2,
                 "frequency_type": "every_n_days", "frequency_value": 2, "scope": "per_crop"},
                {"step": 2, "description": "Kiểm tra sâu bệnh gấc", "mandays_per_ha": 2,
                 "frequency_type": "every_n_days", "frequency_value": 3, "scope": "per_crop", "require_photo": 1},
            ],
        }).insert()

    for bn, zn, tl in BLOCKS:
        if not frappe.db.exists("Crop Cycle", {"block": bn, "crop": "Gấc"}):
            frappe.get_doc({"doctype": "Crop Cycle", "block": bn, "crop": "Gấc",
                            "cultivation_process": "Quy trình Gấc", "start_date": start_date,
                            "status": "active"}).insert()

    frappe.db.commit()
    created = generate_tasks(from_date=start_date, days=10)
    frappe.db.commit()
    print(f"Seed xong. Sinh {created} farm task.")
    return created
