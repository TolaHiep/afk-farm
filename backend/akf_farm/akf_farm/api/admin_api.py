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

@frappe.whitelist()
def create_plot(block_name, zone, area, team_leader=None, boundary=None, status="good"):
    doc = frappe.get_doc({"doctype": "Farm Block", "block_name": block_name, "zone": zone,
                          "area": area, "team_leader": team_leader, "boundary": boundary,
                          "status": status}).insert()
    return serialize_plot(doc.name)


@frappe.whitelist()
def update_plot(name, **kwargs):
    doc = frappe.get_doc("Farm Block", name)
    for f in ("block_name", "zone", "area", "team_leader", "boundary", "status"):
        if f in kwargs:
            doc.set(f, kwargs[f])
    doc.save()
    return serialize_plot(doc.name)


@frappe.whitelist()
def delete_plot(name):
    frappe.delete_doc("Farm Block", name)
    return {"ok": True}


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

def _freq_text(ftype, fval):
    fval = int(fval or 1)
    return {
        "one_time": "1 lần/chu kỳ", "daily": "Hàng ngày",
        "every_n_days": f"{fval} ngày/lần", "n_per_day": f"{fval} lần/ngày",
    }.get(ftype, "1 lần/chu kỳ")


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
            "frequency": _freq_text(s.frequency_type, s.frequency_value),
            "scope": _scope_text(s.scope), "requirePhoto": bool(s.require_photo),
        } for s in doc.steps]
        out.append({"id": p.name, "name": p.process_name, "crop": p.crop, "steps": steps})
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
