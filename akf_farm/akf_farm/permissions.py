import frappe


def farm_task_query(user=None):
    """Giới hạn dữ liệu Farm Task: tổ trưởng chỉ thấy việc của mình; admin thấy tất cả."""
    user = user or frappe.session.user
    roles = frappe.get_roles(user)
    if "AKF Admin" in roles or user == "Administrator":
        return ""
    return f"`tabFarm Task`.team_leader = {frappe.db.escape(user)}"
