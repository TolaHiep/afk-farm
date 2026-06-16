import frappe
from frappe.auth import LoginManager


@frappe.whitelist(allow_guest=True)
def login(usr, pwd):
    """Đăng nhập, set session cookie. Trả thông tin user."""
    lm = LoginManager()
    lm.authenticate(user=usr, pwd=pwd)
    lm.post_login()
    return me()


@frappe.whitelist()
def me():
    """Thông tin người dùng hiện tại + vai trò (admin/team_leader)."""
    user = frappe.session.user
    roles = frappe.get_roles(user)
    role = "admin" if ("AKF Admin" in roles or user == "Administrator") else "team_leader"
    full_name = frappe.db.get_value("User", user, "full_name") or user
    return {"email": user, "full_name": full_name, "role": role, "roles": roles}


@frappe.whitelist()
def logout():
    frappe.local.login_manager.logout()
    frappe.db.commit()
    return {"ok": True}
