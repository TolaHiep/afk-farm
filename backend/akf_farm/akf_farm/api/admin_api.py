import frappe
from frappe.utils import add_days, getdate
from akf_farm.api.serializers import serialize_plot, serialize_zone
from akf_farm.engine.leader_kpi import compute_kpi


@frappe.whitelist()
def list_zones():
    zones = frappe.get_all("Farm Zone", fields=["name", "zone_name", "area", "status", "boundary"])
    return [serialize_zone(dict(z)) for z in zones]


@frappe.whitelist()
def list_plots(zone=None):
    filters = {"zone": zone} if zone else {}
    names = [b.name for b in frappe.get_all("Farm Block", filters=filters, fields=["name"])]
    return [serialize_plot(n) for n in names]


@frappe.whitelist()
def heatmap():
    return {"zones": list_zones(), "plots": list_plots()}


# ---- CRUD vùng ----

@frappe.whitelist()
def create_zone(zone_name, area, boundary=None, status="good", note=None):
    doc = frappe.get_doc({"doctype": "Farm Zone", "zone_name": zone_name, "area": area,
                          "boundary": boundary, "status": status, "note": note}).insert()
    return serialize_zone(doc.name)


@frappe.whitelist()
def update_zone(name, **kwargs):
    doc = frappe.get_doc("Farm Zone", name)
    for f in ("zone_name", "area", "boundary", "status", "note"):
        if f in kwargs:
            doc.set(f, kwargs[f])
    doc.save()
    return serialize_zone(doc.name)


@frappe.whitelist()
def delete_zone(name):
    frappe.delete_doc("Farm Zone", name)
    return {"ok": True}


# ---- CRUD lô ----

def _norm_crops(crops):
    """Chuẩn hoá crops (list / JSON / chuỗi) -> 'Gấc,Sâm' hoặc None."""
    if not crops:
        return None
    if isinstance(crops, str):
        try:
            parsed = frappe.parse_json(crops)
        except Exception:
            parsed = None
        if isinstance(parsed, list):
            crops = parsed
        else:
            return crops.strip() or None
    if isinstance(crops, (list, tuple)):
        items = [str(c).strip() for c in crops if str(c).strip()]
        return ",".join(items) or None
    return str(crops).strip() or None


@frappe.whitelist()
def create_plot(block_name, zone, area, team_leader=None, boundary=None, status="good", crops=None):
    doc = frappe.get_doc({"doctype": "Farm Block", "block_name": block_name, "zone": zone,
                          "area": area, "team_leader": team_leader, "boundary": boundary,
                          "status": status, "crops": _norm_crops(crops)}).insert()
    return serialize_plot(doc.name)


@frappe.whitelist()
def update_plot(name, **kwargs):
    doc = frappe.get_doc("Farm Block", name)
    for f in ("block_name", "zone", "area", "team_leader", "boundary", "status"):
        if f in kwargs:
            doc.set(f, kwargs[f])
    if "crops" in kwargs:
        doc.set("crops", _norm_crops(kwargs["crops"]))
    doc.save()
    return serialize_plot(doc.name)


@frappe.whitelist()
def delete_plot(name):
    frappe.delete_doc("Farm Block", name)
    return {"ok": True}


@frappe.whitelist()
def create_plots_bulk(zone, plots, team_leader=None):
    """Tạo nhiều lô trong 1 request (dùng cho chia lô tự động)."""
    if isinstance(plots, str):
        plots = frappe.parse_json(plots)
    out = []
    for p in plots:
        doc = frappe.get_doc({
            "doctype": "Farm Block",
            "block_name": p.get("block_name"),
            "zone": zone,
            "area": p.get("area"),
            "boundary": p.get("boundary"),
            "team_leader": team_leader or p.get("team_leader"),
            "crops": _norm_crops(p.get("crops")),
            "status": p.get("status") or "good",
        }).insert()
        out.append(serialize_plot(doc.name))
    return out


@frappe.whitelist()
def get_plot(name):
    return serialize_plot(name)


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


# ---- Tổ trưởng & tổ viên ----

def _freq_text(ftype, fval, times=1):
    fval = int(fval or 1)
    times = int(times or 1)
    if ftype == "one_time":
        return "1 lần/chu kỳ"
    if ftype == "daily":
        return "Hàng ngày"
    if ftype == "n_per_period":
        return f"{times} lần / {fval} ngày"
    return "1 lần/chu kỳ"


def _scope_text(scope):
    return "Theo cây" if scope == "per_crop" else "Dùng chung"


@frappe.whitelist()
def list_team_leaders():
    """Tổ trưởng = User có role AKF Team Leader. id = email (khớp teamLeaderId của lô)."""
    users = frappe.get_all("User", filters={"enabled": 1}, fields=["name", "full_name", "username", "enabled"])
    out = []
    for u in users:
        roles = frappe.get_roles(u.name)
        if "AKF Team Leader" not in roles:
            continue
        plot_ids = [b.name for b in frappe.get_all("Farm Block", filters={"team_leader": u.name}, fields=["name"])]
        out.append({
            "id": u.name, "name": u.full_name or u.name, "phone": u.username or "", "email": u.name,
            "plotId": plot_ids[0] if plot_ids else "", "plotIds": plot_ids,
            "status": "active" if u.enabled else "inactive",
        })
    return out


@frappe.whitelist()
def list_team_members():
    rows = frappe.get_all("Team Member", fields=["name", "member_name", "phone", "team_leader", "status"])
    return [{"id": r.name, "name": r.member_name, "phone": r.phone or "",
             "teamLeaderId": r.team_leader or "", "status": r.status or "active"} for r in rows]


# ---- Quy trình & chu kỳ ----

@frappe.whitelist()
def list_processes():
    out = []
    for p in frappe.get_all("Cultivation Process", fields=["name", "process_name", "crop"]):
        doc = frappe.get_doc("Cultivation Process", p.name)
        steps = [{
            "step": s.step, "description": s.description, "workPerHa": s.mandays_per_ha,
            "frequency": _freq_text(s.frequency_type, s.frequency_value, s.times_per_period),
            "frequencyType": s.frequency_type or "one_time", "frequencyValue": s.frequency_value or 1,
            "timesPerPeriod": s.times_per_period or 1,
            "scope": _scope_text(s.scope), "scopeRaw": s.scope or "shared",
            "requirePhoto": bool(s.require_photo),
            "offsetDays": s.offset_days or 0, "prerequisite": s.prerequisite or "",
        } for s in doc.steps]
        out.append({"id": p.name, "name": p.process_name, "crop": p.crop,
                    "cycleLengthDays": doc.cycle_length_days or 0, "steps": steps})
    return out


@frappe.whitelist()
def list_crop_cycles():
    rows = frappe.get_all("Crop Cycle",
        fields=["name", "block", "crop", "cultivation_process", "start_date", "status"])
    return [{"id": r.name, "plotId": r.block, "crop": r.crop, "processId": r.cultivation_process or "",
             "startDate": str(r.start_date) if r.start_date else "", "status": r.status} for r in rows]


# ---- Báo cáo / hỗ trợ / bất thường / thông báo ----

@frappe.whitelist()
def list_anomalies():
    rows = frappe.get_all("Abnormal Report",
        fields=["name", "type", "block", "crop", "reporter", "report_date", "description", "status", "reply"],
        order_by="report_date desc")
    return [{"id": r.name, "type": r.type, "plotId": r.block, "crop": r.crop,
             "reporter": frappe.db.get_value("User", r.reporter, "full_name") if r.reporter else "",
             "date": str(r.report_date) if r.report_date else "", "description": r.description,
             "status": r.status, "reply": r.reply or ""} for r in rows]


@frappe.whitelist()
def list_reports():
    rows = frappe.get_all("Team Leader Report",
        fields=["name", "team_leader", "block", "crop", "report_date", "content", "abnormal", "status", "reply"],
        order_by="report_date desc")
    return [{"id": r.name, "teamLeaderId": r.team_leader or "",
             "reporter": frappe.db.get_value("User", r.team_leader, "full_name") if r.team_leader else "",
             "plotId": r.block, "crop": r.crop, "date": str(r.report_date) if r.report_date else "",
             "content": r.content or "", "abnormal": bool(r.abnormal), "status": r.status,
             "reply": r.reply or ""} for r in rows]


@frappe.whitelist()
def list_support():
    rows = frappe.get_all("Support Request",
        fields=["name", "team_leader", "block", "type", "content", "sent_at", "status", "reply"],
        order_by="sent_at desc")
    return [{"id": r.name, "teamLeaderId": r.team_leader or "",
             "reporter": frappe.db.get_value("User", r.team_leader, "full_name") if r.team_leader else "",
             "plotId": r.block, "type": r.type or "", "content": r.content or "",
             "sentAt": str(r.sent_at) if r.sent_at else "", "status": r.status, "reply": r.reply or ""}
            for r in rows]


@frappe.whitelist()
def reply_support(name, reply, status="replied"):
    doc = frappe.get_doc("Support Request", name)
    doc.reply = reply
    doc.status = status
    doc.save()
    return {"ok": True}


# ---- Cài đặt & dashboard ----

@frappe.whitelist()
def get_settings():
    s = frappe.get_single("AKF Settings")
    return {"appName": s.app_name or "", "companyName": s.company_name or "", "contact": s.contact or "",
            "logoText": s.logo_text or "", "smtpHost": s.smtp_host or "", "smtpPort": s.smtp_port or "",
            "fromEmail": s.from_email or "", "fromName": s.from_name or "", "emailEnabled": bool(s.email_enabled)}


@frappe.whitelist()
def save_settings(**kwargs):
    s = frappe.get_single("AKF Settings")
    mapping = {"appName": "app_name", "companyName": "company_name", "contact": "contact",
               "logoText": "logo_text", "smtpHost": "smtp_host", "smtpPort": "smtp_port",
               "fromEmail": "from_email", "fromName": "from_name", "emailEnabled": "email_enabled"}
    for k, field in mapping.items():
        if k in kwargs:
            s.set(field, kwargs[k])
    s.save()
    return {"ok": True}


@frappe.whitelist()
def team_kpi():
    """KPI theo tổ trưởng (xấp xỉ GĐ1). Trả shape kpiData: top-level + byCrop (Gấc/Sâm)."""
    leaders = list_team_leaders()
    fields = ["onTime", "overdue", "completed", "notDone", "fullReport", "anomalies", "totalWork"]
    out = []
    for ld in leaders:
        tasks = frappe.get_all("Farm Task", filters={"team_leader": ld["id"]}, fields=["status", "crop"])
        ts = [{"status": t.status, "on_time": t.status == "completed", "mandays": 1} for t in tasks]
        report_days = {}
        for r in frappe.get_all("Team Leader Report", filters={"team_leader": ld["id"]},
                                fields=["report_date"]):
            report_days[str(r.report_date)] = True
        anomaly_count = frappe.db.count("Abnormal Report", {"reporter": ld["id"]})
        k = compute_kpi(ts, report_days, anomaly_count)
        row = {
            "teamLeaderId": ld["id"], "name": ld["name"],
            "onTime": round(k["on_time_pct"]), "overdue": k["overdue"], "completed": k["completed"],
            "notDone": k["not_done"], "fullReport": round(k["full_report_pct"]),
            "anomalies": k["anomalies"], "totalWork": k["total_work"],
        }
        gac_n = len([t for t in tasks if t.crop == "Gấc"]) or 1
        share = gac_n / (len(tasks) or 1)
        gac = {f: round(row[f] * share) for f in fields}
        sam = {f: row[f] - gac[f] for f in fields}
        row["byCrop"] = {"Gấc": gac, "Sâm": sam}
        out.append(row)
    return out


@frappe.whitelist()
def list_notifications():
    """Thông báo suy ra: việc quá hạn + bất thường chưa xử lý + báo cáo chờ duyệt."""
    out = []
    for t in frappe.get_all("Farm Task", filters={"status": "overdue"},
                            fields=["name", "title", "block", "task_date"], limit=20):
        out.append({"id": f"t-{t.name}", "type": "overdue", "title": "Công việc quá hạn",
                    "description": f"{t.title} tại {t.block}", "date": str(t.task_date), "read": False})
    for a in frappe.get_all("Abnormal Report", filters={"status": "pending"},
                            fields=["name", "type", "block", "report_date"], limit=20):
        out.append({"id": f"a-{a.name}", "type": "anomaly", "title": "Bất thường mới",
                    "description": f"{a.type} tại {a.block}", "date": str(a.report_date), "read": False,
                    "anomalyId": a.name})
    return out


@frappe.whitelist()
def dashboard(date=None):
    plots = list_plots()
    active = [p for p in plots if p["status"] != "inactive"]
    def ha(m2):
        return (m2 or 0) / 10000.0
    total_ha = round(sum(ha(p["area"]) for p in active), 1)
    gac_ha = round(sum(ha(p["area"]) for p in active if "Gấc" in p["crop"]), 1)
    sam_ha = round(sum(ha(p["area"]) for p in active if "Sâm" in p["crop"]), 1)
    zone_ids = {p["zoneId"] for p in active}
    d = date or str(frappe.utils.getdate())
    overdue = frappe.db.count("Farm Task", {"status": "overdue"})
    new_anomalies = frappe.db.count("Abnormal Report", {"status": "pending"})
    red = len([p for p in plots if p["status"] == "danger"])
    yellow = len([p for p in plots if p["status"] == "warning"])
    return {
        "areaStats": {"totalHa": total_ha, "gacHa": gac_ha, "samHa": sam_ha,
                      "zones": len(zone_ids), "plots": len(active)},
        "overdue": overdue, "newAnomalies": new_anomalies, "redPlots": red, "yellowPlots": yellow,
        "date": d,
    }


# ==========================================================================
# CRUD tổ trưởng (User + role AKF Team Leader). "Xóa" = vô hiệu hóa (enabled=0)
# để giữ lịch sử việc & kích hoạt gán lại việc tương lai (events.user_on_update).
# ==========================================================================

def _leader_dict(name):
    u = frappe.get_doc("User", name)
    plot_ids = [b.name for b in frappe.get_all("Farm Block", filters={"team_leader": name}, fields=["name"])]
    return {"id": u.name, "name": u.full_name or u.name, "phone": u.username or "", "email": u.name,
            "plotId": plot_ids[0] if plot_ids else "", "plotIds": plot_ids,
            "status": "active" if u.enabled else "inactive"}


def _set_leader_plots(email, plot_ids):
    """Đồng bộ danh sách lô phụ trách: gán lô mới, gỡ lô bị bỏ."""
    if plot_ids is None:
        return
    if isinstance(plot_ids, str):
        plot_ids = frappe.parse_json(plot_ids)
    want = set(plot_ids or [])
    current = {b.name for b in frappe.get_all("Farm Block", filters={"team_leader": email}, fields=["name"])}
    for b in want - current:
        frappe.db.set_value("Farm Block", b, "team_leader", email)
    for b in current - want:
        frappe.db.set_value("Farm Block", b, "team_leader", None)


@frappe.whitelist()
def create_team_leader(email, full_name, phone=None, password=None, status="active", plot_ids=None):
    if frappe.db.exists("User", email):
        frappe.throw(f"Email {email} đã tồn tại")
    doc = frappe.get_doc({
        "doctype": "User", "email": email, "first_name": full_name,
        "username": phone or None, "send_welcome_email": 0,
        "enabled": 1 if status == "active" else 0,
        "new_password": password or frappe.generate_hash(length=10),
        "roles": [{"role": "AKF Team Leader"}],
    }).insert(ignore_permissions=True)
    _set_leader_plots(doc.name, plot_ids)
    frappe.db.commit()
    return _leader_dict(doc.name)


@frappe.whitelist()
def update_team_leader(name, full_name=None, phone=None, password=None, status=None, plot_ids=None):
    doc = frappe.get_doc("User", name)
    if full_name is not None:
        doc.first_name = full_name
    if phone is not None:
        doc.username = phone or None
    if status is not None:
        doc.enabled = 1 if status == "active" else 0
    if password:
        doc.new_password = password
    if "AKF Team Leader" not in [r.role for r in doc.roles]:
        doc.append("roles", {"role": "AKF Team Leader"})
    doc.save(ignore_permissions=True)
    _set_leader_plots(name, plot_ids)
    frappe.db.commit()
    return _leader_dict(name)


@frappe.whitelist()
def delete_team_leader(name):
    """Vô hiệu hóa tổ trưởng (giữ dữ liệu); việc tương lai được gán lại tự động."""
    doc = frappe.get_doc("User", name)
    doc.enabled = 0
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True}


# ---- CRUD tổ viên (Team Member) ----

@frappe.whitelist()
def create_team_member(member_name, team_leader=None, phone=None, status="active"):
    doc = frappe.get_doc({"doctype": "Team Member", "member_name": member_name,
                          "team_leader": team_leader or None, "phone": phone, "status": status}).insert()
    return {"id": doc.name, "name": doc.member_name, "phone": doc.phone or "",
            "teamLeaderId": doc.team_leader or "", "status": doc.status or "active"}


@frappe.whitelist()
def update_team_member(name, **kwargs):
    doc = frappe.get_doc("Team Member", name)
    mapping = {"name_": "member_name", "member_name": "member_name", "teamLeaderId": "team_leader",
               "team_leader": "team_leader", "phone": "phone", "status": "status"}
    for k, field in mapping.items():
        if k in kwargs:
            doc.set(field, kwargs[k] or None if field == "team_leader" else kwargs[k])
    doc.save()
    return {"id": doc.name, "name": doc.member_name, "phone": doc.phone or "",
            "teamLeaderId": doc.team_leader or "", "status": doc.status or "active"}


@frappe.whitelist()
def delete_team_member(name):
    frappe.delete_doc("Team Member", name)
    return {"ok": True}


# ---- CRUD quy trình (Cultivation Process + bước con) ----

def _norm_offset(v):
    if v is None or v == "":
        return 0
    try:
        return max(0, int(v))
    except (TypeError, ValueError):
        return 0


def _apply_steps(doc, steps):
    if isinstance(steps, str):
        steps = frappe.parse_json(steps)
    doc.set("steps", [])
    for i, s in enumerate(steps or [], start=1):
        doc.append("steps", {
            "step": i,
            "description": s.get("description"),
            "mandays_per_ha": s.get("workPerHa") or 0,
            "frequency_type": s.get("frequencyType") or "one_time",
            "frequency_value": s.get("frequencyValue") or 1,
            "times_per_period": max(1, int(s.get("timesPerPeriod") or 1)),
            "scope": s.get("scopeRaw") or "shared",
            "require_photo": 1 if s.get("requirePhoto") else 0,
            "offset_days": _norm_offset(s.get("offsetDays")),
            "prerequisite": (s.get("prerequisite") or None),
        })


@frappe.whitelist()
def create_process(process_name, crop=None, steps=None, cycle_length_days=0):
    doc = frappe.get_doc({"doctype": "Cultivation Process", "process_name": process_name,
                          "crop": crop, "cycle_length_days": int(cycle_length_days or 0)})
    _apply_steps(doc, steps)
    doc.insert()
    return {"id": doc.name, "name": doc.process_name, "crop": doc.crop}


@frappe.whitelist()
def update_process(name, process_name=None, crop=None, steps=None, cycle_length_days=None):
    doc = frappe.get_doc("Cultivation Process", name)
    if crop is not None:
        doc.crop = crop
    if cycle_length_days is not None:
        doc.cycle_length_days = int(cycle_length_days or 0)
    if steps is not None:
        _apply_steps(doc, steps)
    doc.save()
    # process_name là autoname (field:process_name) — đổi tên cần rename_doc
    if process_name and process_name != doc.process_name:
        doc = frappe.rename_doc("Cultivation Process", doc.name, process_name, force=True)
    return {"id": doc.name, "name": doc.process_name, "crop": doc.crop}


@frappe.whitelist()
def delete_process(name):
    frappe.delete_doc("Cultivation Process", name)
    return {"ok": True}


# ---- CRUD chu kỳ cây trồng (Crop Cycle) ----

@frappe.whitelist()
def create_crop_cycle(block, crop, start_date, cultivation_process=None, status="active"):
    doc = frappe.get_doc({"doctype": "Crop Cycle", "block": block, "crop": crop,
                          "cultivation_process": cultivation_process or None,
                          "start_date": start_date, "status": status}).insert()
    return {"id": doc.name, "plotId": doc.block, "crop": doc.crop,
            "processId": doc.cultivation_process or "", "startDate": str(doc.start_date), "status": doc.status}


@frappe.whitelist()
def update_crop_cycle(name, **kwargs):
    doc = frappe.get_doc("Crop Cycle", name)
    mapping = {"plotId": "block", "block": "block", "crop": "crop", "processId": "cultivation_process",
               "cultivation_process": "cultivation_process", "startDate": "start_date",
               "start_date": "start_date", "status": "status"}
    for k, field in mapping.items():
        if k in kwargs:
            doc.set(field, kwargs[k] or None if field == "cultivation_process" else kwargs[k])
    doc.save()
    return {"id": doc.name, "plotId": doc.block, "crop": doc.crop,
            "processId": doc.cultivation_process or "", "startDate": str(doc.start_date), "status": doc.status}


@frappe.whitelist()
def delete_crop_cycle(name):
    """Xoá chu kỳ: gỡ các việc chưa hoàn thành trước (Farm Task link tới cycle).
    - Chưa có việc hoàn thành -> xoá hẳn chu kỳ.
    - Đã có việc hoàn thành -> đóng chu kỳ (status=closed, giữ lịch sử); generate_tasks
      chỉ sinh cho cycle active nên tự ngừng sinh việc mới."""
    tasks = frappe.get_all("Farm Task", filters={"cycle": name}, fields=["name", "status"])
    has_completed = any(t.status == "completed" for t in tasks)
    for t in tasks:
        if t.status != "completed":
            frappe.delete_doc("Farm Task", t.name, force=True, ignore_permissions=True)
    if has_completed:
        frappe.db.set_value("Crop Cycle", name, "status", "closed")
        return {"deleted": False, "closed": True}
    frappe.delete_doc("Crop Cycle", name)
    return {"deleted": True, "closed": False}


# ---- Cập nhật trạng thái / phản hồi bất thường ----

@frappe.whitelist()
def update_anomaly(name, status=None, reply=None):
    doc = frappe.get_doc("Abnormal Report", name)
    if status is not None:
        doc.status = status
    if reply is not None:
        doc.reply = reply
    doc.save()
    return {"ok": True}
