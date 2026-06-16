import frappe
from akf_farm.engine.status_calculator import crop_status, rollup_status


def _parse_boundary(raw):
    if not raw:
        return None
    if isinstance(raw, (dict, list)):
        return raw
    try:
        return frappe.parse_json(raw)
    except Exception:
        return None


def serialize_crop_on_plot(block, crop):
    tasks = frappe.get_all("Farm Task", filters={"block": block, "crop": crop}, fields=["status"])
    anomalies = frappe.get_all("Abnormal Report", filters={"block": block, "crop": crop}, fields=["status"])
    done = len([t for t in tasks if t.status == "completed"])
    total = len(tasks)
    status = crop_status([dict(t) for t in tasks], [dict(a) for a in anomalies])
    return {"crop": crop, "done": done, "total": total, "status": status}


def serialize_plot(block_name):
    """Trả lô đúng shape mockData: id, name, zoneId, area, teamLeader(Id), crops[], status (worst-of)."""
    b = frappe.get_doc("Farm Block", block_name)
    crops = [c.crop for c in frappe.get_all(
        "Crop Cycle", filters={"block": block_name, "status": "active"}, fields=["crop"])]
    crop_objs = [serialize_crop_on_plot(block_name, c) for c in crops]
    statuses = [c["status"] for c in crop_objs] or [b.status]
    return {
        "id": b.name, "name": b.block_name, "zoneId": b.zone, "area": b.area,
        "teamLeader": (frappe.db.get_value("User", b.team_leader, "full_name") if b.team_leader else ""),
        "teamLeaderId": b.team_leader or "",
        "crops": crop_objs, "crop": " + ".join(crops),
        "done": sum(c["done"] for c in crop_objs), "total": sum(c["total"] for c in crop_objs),
        "status": rollup_status(statuses),
        "boundary": _parse_boundary(b.boundary),
    }


def serialize_zone(zone):
    z = zone if isinstance(zone, dict) else frappe.get_doc("Farm Zone", zone).as_dict()
    plot_count = frappe.db.count("Farm Block", {"zone": z["name"]})
    return {"id": z["name"], "name": z.get("zone_name"), "area": z.get("area"),
            "status": z.get("status"), "plots": plot_count,
            "boundary": _parse_boundary(z.get("boundary"))}
