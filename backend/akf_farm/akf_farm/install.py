import frappe

AKF_ROLES = ["AKF Admin", "AKF Team Leader"]


def after_install():
    ensure_roles()


def enable_scheduler():
    """Scheduler bắt buộc cho job sinh việc / đánh quá hạn / email.
    Bật lại sau mỗi migrate (site mới hoặc dev có thể để tắt). Idempotent."""
    frappe.db.set_single_value("System Settings", "enable_scheduler", 1)


def ensure_roles():
    """Tạo 2 role nghiệp vụ nếu chưa có (idempotent)."""
    for role in AKF_ROLES:
        if not frappe.db.exists("Role", role):
            frappe.get_doc({"doctype": "Role", "role_name": role, "desk_access": 1}).insert(
                ignore_permissions=True
            )
    frappe.db.commit()
