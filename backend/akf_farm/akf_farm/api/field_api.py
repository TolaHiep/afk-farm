import base64
import json
import math
import re

import frappe
from frappe.utils import getdate

_DATA_URL = re.compile(r"^data:image/(\w+);base64,(.+)$", re.DOTALL)

_MAX_PHOTOS_SAVE = 5
_MAX_PHOTO_BYTES = 10 * 1024 * 1024  # 10MB / anh sau decode
_ALLOWED_EXT = {"jpg", "jpeg", "png", "webp"}


def _save_photos(parent_doc, photos):
    """Doi moi data URL base64 thanh File private dinh vao parent_doc; giu nguyen URL da co (replay)."""
    urls = []
    created = 0
    for i, p in enumerate(_as_list(photos)):
        if not isinstance(p, str):
            continue
        m = _DATA_URL.match(p)
        if not m:
            urls.append(p)
            continue
        try:
            ext = m.group(1).lower()
            ext = "jpg" if ext == "jpeg" else ext
            if ext not in _ALLOWED_EXT:
                frappe.log_error(f"akf_farm: extension khong cho phep: {ext}", "akf_farm photo save failed")
                continue
            content = base64.b64decode(m.group(2))
            if len(content) > _MAX_PHOTO_BYTES:
                frappe.log_error(f"akf_farm: anh vuot kich thuoc {len(content)} > {_MAX_PHOTO_BYTES}", "akf_farm photo save failed")
                continue
            if created >= _MAX_PHOTOS_SAVE:
                frappe.log_error(f"akf_farm: da dat gioi han {_MAX_PHOTOS_SAVE} anh, bo qua phan con lai", "akf_farm photo save failed")
                continue
            _file = frappe.get_doc({
                "doctype": "File",
                "file_name": f"{parent_doc.doctype}-{parent_doc.name}-{i}.{ext}",
                "attached_to_doctype": parent_doc.doctype,
                "attached_to_name": parent_doc.name,
                "is_private": 1,
                "content": content,
            }).insert(ignore_permissions=True)
            urls.append(_file.file_url)
            created += 1
        except Exception:
            frappe.log_error(frappe.get_traceback(), "akf_farm photo save failed")
            continue
    return urls


def _as_list(photos):
    if isinstance(photos, list):
        return photos
    return json.loads(photos) if photos else []


_GPS_TOLERANCE_M = 50  # ngoai polygon nhung <= 50m van coi la trong lo (dung sai GPS dien thoai)


def _parse_boundary(block_name):
    """Tra mang [(lat, lng)] tu field boundary GeoJSON Polygon; [] neu khong co/loi."""
    raw = frappe.db.get_value("Farm Block", block_name, "boundary")
    if not raw:
        return []
    try:
        obj = json.loads(raw) if isinstance(raw, str) else raw
        ring = obj["coordinates"][0] if obj.get("type") == "Polygon" else None
        pts = [(float(c[1]), float(c[0])) for c in ring if len(c) >= 2]  # dao [lng,lat] -> (lat,lng)
        if len(pts) > 1 and pts[0] == pts[-1]:
            pts.pop()  # bo diem dong vong trung dau
        return pts if len(pts) >= 3 else []
    except Exception:
        return []


def _point_in_polygon(lat, lng, poly):
    """Ray casting tren (lat,lng). poly = [(lat,lng)]."""
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        yi, xi = poly[i]
        yj, xj = poly[j]
        if (yi > lat) != (yj > lat) and lng < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def _distance_to_polygon_m(lat, lng, poly):
    """Khoang cach (m) tu diem toi canh gan nhat cua polygon.

    Chieu equirectangular quanh diem -> met (du chinh xac cho nguong 50m).
    """
    R = 6371000.0
    p = math.pi / 180
    cos_lat = math.cos(lat * p)

    def to_xy(la, ln):
        return ((ln - lng) * p * cos_lat * R, (la - lat) * p * R)

    pts = [to_xy(py, px) for (py, px) in poly]
    best = float("inf")
    n = len(pts)
    for i in range(n):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % n]
        dx, dy = bx - ax, by - ay
        seg2 = dx * dx + dy * dy
        t = 0.0 if seg2 == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / seg2))
        cx, cy = ax + t * dx, ay + t * dy
        best = min(best, math.hypot(cx, cy))
    return best


def _geo_flag(block_name, lat, lng):
    """Tra (gps_status, distance_m). Tin cay phia server (client khong tu quyet co)."""
    if lat is None or lng is None:
        return ("missing", None)
    poly = _parse_boundary(block_name)
    if len(poly) < 3:
        return ("missing", None)  # lo chua ve ranh gioi -> khong kiem tra duoc
    if _point_in_polygon(lat, lng, poly):
        return ("ok", 0.0)
    dist = _distance_to_polygon_m(lat, lng, poly)
    return (("ok" if dist <= _GPS_TOLERANCE_M else "far"), dist)


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
