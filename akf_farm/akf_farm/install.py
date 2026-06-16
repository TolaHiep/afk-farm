import frappe

AKF_ROLES = ["AKF Admin", "AKF Team Leader"]


def after_install():
    ensure_roles()


def ensure_roles():
    """Tạo 2 role nghiệp vụ nếu chưa có (idempotent)."""
    for role in AKF_ROLES:
        if not frappe.db.exists("Role", role):
            frappe.get_doc({"doctype": "Role", "role_name": role, "desk_access": 1}).insert(
                ignore_permissions=True
            )
    frappe.db.commit()
