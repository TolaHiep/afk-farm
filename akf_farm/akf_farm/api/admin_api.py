import frappe
from frappe.utils import add_days, getdate
from akf_farm.api.serializers import serialize_plot, serialize_zone


@frappe.whitelist()
def list_zones():
    zones = frappe.get_all("Farm Zone", fields=["name", "zone_name", "area", "status"])
    return [serialize_zone(dict(z)) for z in zones]


@frappe.whitelist()
def list_plots(zone=None):
    filters = {"zone": zone} if zone else {}
    names = [b.name for b in frappe.get_all("Farm Block", filters=filters, fields=["name"])]
    return [serialize_plot(n) for n in names]


@frappe.whitelist()
def heatmap():
    return {"zones": list_zones(), "plots": list_plots()}


@frappe.whitelist()
def calendar(from_date, days=10):
    to_date = add_days(getdate(from_date), int(days) - 1)
    return frappe.get_all(
        "Farm Task",
        filters={"task_date": ["between", [from_date, to_date]]},
        fields=["name as id", "title", "block as plotId", "crop", "task_date as date",
                "status", "team_leader as teamLeaderId", "require_photo as requirePhoto", "priority"],
        order_by="task_date asc",
    )


@frappe.whitelist()
def reschedule_task(task, new_date):
    """Lùi lịch 1 việc — độc lập theo cây (không ảnh hưởng cây khác cùng lô)."""
    doc = frappe.get_doc("Farm Task", task)
    doc.task_date = new_date
    doc.save()
    return {"ok": True}


@frappe.whitelist()
def reassign_task(task, team_leader):
    doc = frappe.get_doc("Farm Task", task)
    doc.team_leader = team_leader
    doc.save()  # Version log của Frappe tự ghi audit
    return {"ok": True}
