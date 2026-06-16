import datetime as dt


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
    step = 1 if ftype in ("daily", "n_per_day") else fval
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


def generate_tasks(from_date=None, days=10):
    """Sinh Farm Task cho horizon `days` ngày từ các Crop Cycle active. Idempotent.

    Import frappe CỤC BỘ để các hàm thuần phía trên vẫn test được không cần Frappe.
    """
    import frappe
    from frappe.utils import add_days, getdate

    from_d = getdate(from_date) if from_date else getdate()
    to_d = getdate(add_days(from_d, days - 1))
    created = 0
    cycles = frappe.get_all(
        "Crop Cycle",
        filters={"status": "active"},
        fields=["name", "block", "crop", "cultivation_process", "start_date"],
    )
    rows = []
    for c in cycles:
        if not c.cultivation_process:
            continue
        proc = frappe.get_doc("Cultivation Process", c.cultivation_process)
        for s in proc.steps:
            freq = (s.frequency_type, s.frequency_value) if s.frequency_type else ("one_time", 1)
            for d in due_dates(getdate(c.start_date), freq, from_d, to_d):
                rows.append({
                    "cycle": c.name, "block": c.block, "crop": c.crop, "date": d,
                    "description": s.description, "scope": s.scope, "require_photo": s.require_photo,
                })
    for r in dedupe_shared(rows):
        # idempotent: khóa theo (block, crop, ngày, tên việc)
        exists = frappe.db.exists("Farm Task", {
            "block": r["block"], "crop": r["crop"],
            "task_date": str(r["date"]), "title": r["description"],
        })
        if exists:
            continue
        frappe.get_doc({
            "doctype": "Farm Task", "title": r["description"], "block": r["block"],
            "crop": r["crop"], "cycle": r.get("cycle"), "task_date": str(r["date"]),
            "status": "pending", "require_photo": r.get("require_photo") or 0,
        }).insert()
        created += 1
    return created
