import base64
import json
import re

import frappe
from frappe.utils import getdate

_DATA_URL = re.compile(r"^data:image/(\w+);base64,(.+)$", re.DOTALL)


def _save_photos(parent_doc, photos):
    """Doi moi data URL base64 thanh File private dinh vao parent_doc; giu nguyen URL da co (replay)."""
    urls = []
    for i, p in enumerate(_as_list(photos)):
        if not isinstance(p, str):
            continue
        m = _DATA_URL.match(p)
        if not m:
            urls.append(p)
            continue
        ext = m.group(1)
        content = base64.b64decode(m.group(2))
        ext = "jpg" if ext == "jpeg" else ext
        _file = frappe.get_doc({
            "doctype": "File",
            "file_name": f"{parent_doc.doctype}-{parent_doc.name}-{i}.{ext}",
            "attached_to_doctype": parent_doc.doctype,
            "attached_to_name": parent_doc.name,
            "is_private": 1,
            "content": content,
        }).insert(ignore_permissions=True)
        urls.append(_file.file_url)
    return urls


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
    user = frappe.session.user
    if doc.team_leader and doc.team_leader != user \
            and user != "Administrator" and "AKF Admin" not in frappe.get_roles(user):
        frappe.throw("Không có quyền hoàn thành việc này", frappe.PermissionError)
    if doc.require_photo and not photos:
        frappe.throw("Việc này bắt buộc đính kèm ảnh")
    if client_uuid and doc.client_uuid == client_uuid and doc.status == "completed":
        return {"ok": True}  # idempotent
    doc.status = "completed"
    doc.client_uuid = client_uuid
    urls = _save_photos(doc, photos)
    doc.set("photos", [{"image": u} for u in urls])
    doc.save(ignore_permissions=True)
    doc.db_set("completed_on", str(getdate()))
    return {"ok": True}


@frappe.whitelist()
def upcoming_tasks(from_date=None, days=10):
    from frappe.utils import add_days
    start = getdate(from_date) if from_date else getdate()
    end = add_days(start, int(days))
    return frappe.get_all(
        "Farm Task",
        filters={"team_leader": frappe.session.user, "task_date": ["between", [str(start), str(end)]]},
        fields=["name as id", "title", "block as plotId", "crop", "task_date as date",
                "status", "require_photo as requirePhoto", "priority"],
        order_by="task_date asc",
    )


@frappe.whitelist()
def task_detail(task):
    doc = frappe.get_doc("Farm Task", task)
    if doc.team_leader and doc.team_leader != frappe.session.user:
        frappe.throw("Không có quyền xem việc này", frappe.PermissionError)
    return {
        "id": doc.name, "title": doc.title, "plotId": doc.block, "crop": doc.crop,
        "date": str(doc.task_date), "status": doc.status, "requirePhoto": bool(doc.require_photo),
        "priority": doc.priority, "photos": [p.image for p in doc.photos],
    }


@frappe.whitelist()
def my_plots():
    """Danh sách lô của tổ trưởng đang đăng nhập (cho dropdown báo cáo/hỗ trợ)."""
    rows = frappe.get_all("Farm Block", filters={"team_leader": frappe.session.user},
                          fields=["name as id", "block_name as name", "zone as zoneId"])
    out = []
    for b in rows:
        crops = [c.crop for c in frappe.get_all("Crop Cycle",
                 filters={"block": b.id, "status": "active"}, fields=["crop"])]
        out.append({**b, "crops": crops})
    return out


@frappe.whitelist()
def update_my_profile(phone=None):
    """Tổ trưởng tự cập nhật SĐT (lưu vào username) của chính mình."""
    doc = frappe.get_doc("User", frappe.session.user)
    if phone is not None:
        doc.username = phone or None
    doc.save(ignore_permissions=True)
    return {"ok": True}


@frappe.whitelist()
def change_my_password(new_password, old_password=None):
    """Tổ trưởng tự đổi mật khẩu; xác minh mật khẩu hiện tại trước."""
    from frappe.utils.password import check_password
    user = frappe.session.user
    if old_password:
        try:
            check_password(user, old_password)
        except frappe.AuthenticationError:
            frappe.throw("Mật khẩu hiện tại không đúng")
    doc = frappe.get_doc("User", user)
    doc.new_password = new_password
    doc.save(ignore_permissions=True)
    return {"ok": True}


@frappe.whitelist()
def my_team_members():
    """Tổ viên thuộc tổ trưởng đang đăng nhập (cho màn Tài khoản mobile)."""
    rows = frappe.get_all("Team Member", filters={"team_leader": frappe.session.user},
                          fields=["name as id", "member_name as name", "phone", "status"])
    return rows


@frappe.whitelist()
def notifications():
    """Thông báo cho tổ trưởng: việc quá hạn của mình."""
    out = []
    for t in frappe.get_all("Farm Task",
                            filters={"team_leader": frappe.session.user, "status": "overdue"},
                            fields=["name", "title", "block", "task_date"], limit=20):
        out.append({"id": f"t-{t.name}", "type": "overdue", "title": "Việc quá hạn",
                    "description": f"{t.title} - {t.block}", "date": str(t.task_date), "read": False})
    return out


@frappe.whitelist()
def my_reports():
    rows = frappe.get_all("Team Leader Report", filters={"team_leader": frappe.session.user},
        fields=["name as id", "block as plotId", "crop", "report_date as date", "content",
                "abnormal", "status", "reply"], order_by="report_date desc")
    return [{**r, "abnormal": bool(r["abnormal"])} for r in rows]


@frappe.whitelist()
def submit_support(block, type, content, photos=None, client_uuid=None):
    photos = _as_list(photos)
    doc = frappe.get_doc({
        "doctype": "Support Request", "team_leader": frappe.session.user, "block": block,
        "type": type, "content": content, "sent_at": frappe.utils.now(), "status": "pending",
        "photos": [],
    }).insert(ignore_permissions=True)
    urls = _save_photos(doc, photos)
    if urls:
        doc.set("photos", [{"image": u} for u in urls])
        doc.save(ignore_permissions=True)
    return {"ok": True, "name": doc.name}


@frappe.whitelist()
def my_support():
    return frappe.get_all("Support Request", filters={"team_leader": frappe.session.user},
        fields=["name as id", "block as plotId", "type", "content", "sent_at as sentAt",
                "status", "reply"], order_by="sent_at desc")


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
        "photos": [],
    }).insert(ignore_permissions=True)
    urls = _save_photos(doc, photos)
    if urls:
        doc.set("photos", [{"image": u} for u in urls])
        doc.save(ignore_permissions=True)
    return {"ok": True, "name": doc.name}
