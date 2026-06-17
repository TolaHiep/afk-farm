import datetime as dt


def _prereq_anchor(cycle_name, prereq_title):
    """Ngày neo cho bước phụ thuộc = max(completed_on) của task prereq (theo title) đã hoàn thành
    trong cycle. None nếu chưa có task prereq nào completed. Fallback task_date nếu completed_on rỗng."""
    import frappe
    from frappe.utils import getdate

    tasks = frappe.get_all(
        "Farm Task",
        filters={"cycle": cycle_name, "title": prereq_title, "status": "completed"},
        fields=["completed_on", "task_date"],
    )
    if not tasks:
        return None
    return max(getdate(t.completed_on or t.task_date) for t in tasks)


def compute_mandays(mandays_per_ha: float, area_m2: float) -> float:
    ha = (area_m2 or 0) / 10000.0
    return round((mandays_per_ha or 0) * ha, 2)


def due_dates(start, freq, from_date, to_date):
    """freq=(type,value). Trả list ngày (date) trong [from_date,to_date]."""
    ftype, fval = freq
    fval = max(1, int(fval or 1))
    out = []
    if ftype == "one_time":
        if from_date <= start <= to_date:
            out.append(start)
        return out
    step = 1 if ftype == "daily" else fval
    cur = start
    if cur < from_date:
        gap = (from_date - start).days
        k = (gap + step - 1) // step
        cur = start + dt.timedelta(days=k * step)
    while cur <= to_date:
        if cur >= from_date:
            out.append(cur)
        cur += dt.timedelta(days=step)
    return out


def dedupe_shared(rows):
    """Gộp việc scope=shared trùng (block, date, description). per_crop giữ nguyên."""
    seen = set()
    out = []
    for r in rows:
        if r.get("scope") == "shared":
            key = (r["block"], str(r["date"]), r["description"])
            if key in seen:
                continue
            seen.add(key)
            r = {**r, "crop": "Chung"}
        out.append(r)
    return out


def generate_tasks(from_date=None, days=10, cycle=None):
    """Sinh Farm Task cho horizon `days` ngày từ các Crop Cycle active. Idempotent.
    `cycle` (tùy chọn): chỉ sinh cho 1 chu kỳ (dùng khi tạo chu kỳ / hoàn thành 1 việc) —
    tránh quét lại toàn bộ chu kỳ mỗi lần.

    Import frappe CỤC BỘ để các hàm thuần phía trên vẫn test được không cần Frappe.
    """
    import frappe
    from frappe.utils import add_days, getdate

    from_d = getdate(from_date) if from_date else getdate()
    to_d = getdate(add_days(from_d, days - 1))
    created = 0
    filters = {"status": "active"}
    if cycle:
        filters["name"] = cycle
    cycles = frappe.get_all(
        "Crop Cycle",
        filters=filters,
        fields=["name", "block", "crop", "cultivation_process", "start_date"],
    )
    area_of = {}
    rows = []
    for c in cycles:
        if not c.cultivation_process:
            continue
        if c.block not in area_of:
            area_of[c.block] = frappe.db.get_value("Farm Block", c.block, "area") or 0
        proc = frappe.get_doc("Cultivation Process", c.cultivation_process)
        start = getdate(c.start_date)
        window_end = to_d
        cyclen = int(proc.cycle_length_days or 0)
        if cyclen > 0:
            cycle_end = getdate(add_days(start, cyclen))
            if cycle_end < window_end:
                window_end = cycle_end
        for s in proc.steps:
            freq = (s.frequency_type, s.frequency_value) if s.frequency_type else ("one_time", 1)
            offset = int(s.offset_days or 0)
            if s.prerequisite:
                base = _prereq_anchor(c.name, s.prerequisite)
                if base is None:
                    continue  # prereq chưa hoàn thành -> chưa sinh
                anchor = getdate(add_days(base, offset))
            else:
                anchor = getdate(add_days(start, offset))
            times = max(1, int(s.times_per_period or 1)) if s.frequency_type == "n_per_period" else 1
            for d in due_dates(anchor, freq, from_d, window_end):
                for k in range(times):
                    title = s.description if times == 1 else f"{s.description} (lần {k + 1}/{times})"
                    rows.append({
                        "cycle": c.name, "block": c.block, "crop": c.crop, "date": d,
                        "description": title, "scope": s.scope, "require_photo": s.require_photo,
                        "mandays": compute_mandays(s.mandays_per_ha, area_of[c.block]),
                    })
    for r in dedupe_shared(rows):
        if r.get("scope") == "shared":
            exists = frappe.db.exists("Farm Task", {
                "block": r["block"], "crop": "Chung",
                "task_date": str(r["date"]), "title": r["description"],
            })
        else:
            exists = frappe.db.exists("Farm Task", {
                "cycle": r["cycle"], "task_date": str(r["date"]), "title": r["description"],
            })
        if exists:
            continue
        frappe.get_doc({
            "doctype": "Farm Task", "title": r["description"], "block": r["block"],
            "crop": r["crop"], "cycle": r.get("cycle"), "task_date": str(r["date"]),
            "status": "pending", "require_photo": r.get("require_photo") or 0,
            "mandays": r.get("mandays") or 0,
        }).insert()
        created += 1
    # Tự gán tổ trưởng cho việc trong cửa sổ (ưu tiên chủ lô active, còn lại cân tải)
    assign_tasks(from_date=str(from_d), days=days)
    return created


def _active_leaders():
    """Danh sách email tổ trưởng đang hoạt động (User enabled + role AKF Team Leader)."""
    import frappe

    out = []
    for u in frappe.get_all("User", filters={"enabled": 1}, fields=["name"]):
        if "AKF Team Leader" in frappe.get_roles(u.name):
            out.append(u.name)
    return out


def _assign_day(day, leaders, owners):
    """Gán/cân tải tổ trưởng cho việc của 1 ngày. Chỉ đụng việc chưa có tổ trưởng active."""
    import frappe
    from akf_farm.engine.workload_balancer import assign_leaders

    day_tasks = frappe.get_all("Farm Task", filters={"task_date": day},
                               fields=["name", "block", "team_leader", "mandays"])
    load = {l: 0.0 for l in leaders}
    need = []
    for t in day_tasks:
        if t.team_leader in load:
            load[t.team_leader] += float(t.mandays or 1)
        else:
            need.append(t)
    if not need or not leaders:
        return 0
    result = assign_leaders(
        [{"id": t.name, "block": t.block, "mandays": t.mandays or 1} for t in need],
        owners, leaders, initial_load=load,
    )
    for tname, leader in result.items():
        frappe.db.set_value("Farm Task", tname, "team_leader", leader)
    return len(need)


def assign_tasks(from_date=None, days=10):
    """Cân tải gán tổ trưởng cho mọi việc trong cửa sổ. Ưu tiên chủ lô (nếu active)."""
    import frappe
    from frappe.utils import add_days, getdate

    leaders = _active_leaders()
    if not leaders:
        return 0
    owners = {}
    for b in frappe.get_all("Farm Block", fields=["name", "team_leader"]):
        if b.team_leader in leaders:
            owners[b.name] = b.team_leader
    from_d = getdate(from_date) if from_date else getdate()
    n = 0
    for i in range(int(days)):
        n += _assign_day(str(add_days(from_d, i)), leaders, owners)
    return n


def mark_overdue(today=None):
    """Đánh dấu quá hạn: việc đến hạn trước hôm nay mà chưa hoàn thành -> overdue."""
    import frappe
    from frappe.utils import getdate

    d = str(getdate(today)) if today else str(getdate())
    names = frappe.get_all("Farm Task",
        filters={"task_date": ["<", d], "status": ["in", ["pending", "in-progress"]]},
        fields=["name"])
    for t in names:
        frappe.db.set_value("Farm Task", t.name, "status", "overdue")
    return len(names)


def reassign_inactive_leader(leader):
    """Khi tổ trưởng nghỉ: gán lại việc tương lai (chưa xong) của họ cho tổ trưởng active khác."""
    import frappe
    from frappe.utils import getdate

    today = str(getdate())
    dates = frappe.get_all("Farm Task",
        filters={"team_leader": leader, "task_date": [">=", today],
                 "status": ["in", ["pending", "in-progress"]]},
        fields=["distinct task_date as d"])
    leaders = _active_leaders()
    if not leaders:
        return 0
    owners = {}
    for b in frappe.get_all("Farm Block", fields=["name", "team_leader"]):
        if b.team_leader in leaders:
            owners[b.name] = b.team_leader
    n = 0
    for row in dates:
        n += _assign_day(str(row.d), leaders, owners)
    return n
