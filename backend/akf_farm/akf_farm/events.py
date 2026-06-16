import frappe
from akf_farm.engine.task_generator import reassign_inactive_leader


def user_on_update(doc, method=None):
    """Khi một User là tổ trưởng AKF chuyển sang nghỉ (enabled=0), gán lại việc tương lai."""
    if doc.enabled:
        return
    if not doc.has_value_changed("enabled"):
        return
    if "AKF Team Leader" not in frappe.get_roles(doc.name):
        return
    reassign_inactive_leader(doc.name)
