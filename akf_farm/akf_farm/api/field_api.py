import json
import frappe
from frappe.utils import getdate


def _as_list(photos):
    if isinstance(photos, list):
        return photos
    return json.loads(photos) if photos else []


@frappe.whitelist()
def today_tasks(date=None):
    d = str(getdate(date)) if date else str(getdate())
    return frappe.get_all(
        "Farm Task",
        filters={"team_leader": frappe.session.user, "task_date": d},
        fields=["name as id", "title", "block as plotId", "crop", "task_date as date",
                "status", "require_photo as requirePhoto", "priority"],
    )


@frappe.whitelist()
def complete_task(task, client_uuid=None, photos=None):
    photos = _as_list(photos)
    doc = frappe.get_doc("Farm Task", task)
    if doc.require_photo and not photos:
        frappe.throw("Việc này bắt buộc đính kèm ảnh")
    if client_uuid and doc.client_uuid == client_uuid and doc.status == "completed":
        return {"ok": True}  # idempotent
    doc.status = "completed"
    doc.client_uuid = client_uuid
    doc.set("photos", [{"image": p} for p in photos])
    doc.save()
    return {"ok": True}


@frappe.whitelist()
def submit_report(block, crop, date, content, photos=None, abnormal=0, client_uuid=None):
    photos = _as_list(photos)
    if client_uuid and frappe.db.exists("Team Leader Report", {"client_uuid": client_uuid}):
        return {"ok": True}  # idempotent chống gửi trùng offline
    if int(abnormal or 0) and not photos:
        frappe.throw("Báo cáo bất thường bắt buộc ảnh")
    doc = frappe.get_doc({
        "doctype": "Team Leader Report", "team_leader": frappe.session.user,
        "block": block, "crop": crop, "report_date": date, "content": content,
        "abnormal": int(abnormal or 0), "client_uuid": client_uuid,
        "photos": [{"image": p} for p in photos],
    }).insert()
    return {"ok": True, "name": doc.name}
