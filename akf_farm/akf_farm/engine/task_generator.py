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
