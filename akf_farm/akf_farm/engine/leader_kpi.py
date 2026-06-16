def compute_kpi(tasks, report_days, anomaly_count=0):
    completed = [t for t in tasks if t.get("status") == "completed"]
    overdue = [t for t in tasks if t.get("status") == "overdue"]
    not_done = [t for t in tasks if t.get("status") in ("pending", "in-progress", "overdue")]
    on_time = [t for t in completed if t.get("on_time")]
    on_time_pct = round(100.0 * len(on_time) / len(completed), 1) if completed else 0.0
    full_days = [d for d, ok in report_days.items() if ok]
    full_report_pct = round(100.0 * len(full_days) / len(report_days), 1) if report_days else 0.0
    return {
        "completed": len(completed), "overdue": len(overdue), "not_done": len(not_done),
        "on_time_pct": on_time_pct, "full_report_pct": full_report_pct,
        "anomalies": anomaly_count, "total_work": sum(int(t.get("mandays") or 0) for t in tasks),
    }
