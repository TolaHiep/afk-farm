ORDER = {"danger": 4, "warning": 3, "pending": 2, "good": 1, "done": 1, "inactive": 0}


def crop_status(tasks, anomalies):
    if any(a.get("status") in ("pending", "in-progress") for a in anomalies):
        return "danger" if any(a.get("status") == "pending" for a in anomalies) else "warning"
    if any(t.get("status") == "overdue" for t in tasks):
        return "danger"
    if any(t.get("status") in ("pending", "in-progress") for t in tasks):
        return "warning"
    if tasks and all(t.get("status") == "completed" for t in tasks):
        return "good"
    return "good"


def rollup_status(statuses):
    if not statuses:
        return "good"
    return max(statuses, key=lambda s: ORDER.get(s, 0))
