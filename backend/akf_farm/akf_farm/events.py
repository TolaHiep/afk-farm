import frappe
from akf_farm.engine.task_generator import reassign_inactive_leader, generate_tasks


def crop_cycle_after_insert(doc, method=None):
    """Tạo Crop Cycle = bắt đầu trồng một cây trên một lô → sinh ngay việc cho cửa sổ
    10 ngày (idempotent). Bổ sung cho job daily để có phản hồi tức thì. Lỗi sinh việc
    không được chặn việc lưu chu kỳ — log lại để job daily lo tiếp."""
    try:
        generate_tasks(cycle=doc.name)  # chỉ sinh cho chu kỳ vừa tạo
    except Exception:
        frappe.log_error(frappe.get_traceback(), "crop_cycle_after_insert: generate_tasks failed")


def user_on_update(doc, method=None):
    """Khi một User là tổ trưởng AKF chuyển sang nghỉ (enabled=0), gán lại việc tương lai."""
    if doc.enabled:
        return
    if not doc.has_value_changed("enabled"):
        return
    if "AKF Team Leader" not in frappe.get_roles(doc.name):
        return
    reassign_inactive_leader(doc.name)
