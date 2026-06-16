import frappe
from akf_farm.engine.frequency import parse_frequency

SCOPE_MAP = {"dùng chung": "shared", "toàn bộ lô": "shared", "theo cây": "per_crop"}


def import_rows(process_name, crop, rows):
    """Tạo Cultivation Process + steps từ list dict (cột Bước, Mô tả, Công/ha, Tần suất, Phạm vi)."""
    steps = []
    for i, r in enumerate(rows, 1):
        ftype, fval = parse_frequency(str(r.get("Tần suất", "")))
        scope = SCOPE_MAP.get(str(r.get("Phạm vi", "")).strip().lower(), "per_crop")
        steps.append({
            "step": r.get("Bước", i), "description": r["Mô tả"],
            "mandays_per_ha": r.get("Công/ha", 0), "frequency_type": ftype,
            "frequency_value": fval, "scope": scope,
        })
    doc = frappe.get_doc({
        "doctype": "Cultivation Process", "process_name": process_name, "crop": crop, "steps": steps,
    }).insert()
    return doc.name


def _num(s):
    s = str(s).replace(",", ".").strip()
    try:
        return float(s)
    except ValueError:
        return 0


def parse_markdown_tables(text):
    """Tách các bảng quy trình trong docs/quy-trinh-canh-tac.md theo từng cây.

    Trả dict {crop: [rows]} với rows = list dict (Bước, Mô tả, Công/ha, Tần suất, Phạm vi).
    Bỏ qua dòng marker lặp ("Quay về Bước 1") và dòng không có lịch (Phạm vi rỗng/—).
    """
    out = {}
    crop = None
    for line in text.splitlines():
        ls = line.strip()
        if ls.startswith("## ") and "Sâm" in ls:
            crop, out[crop] = "Sâm", []
            continue
        if ls.startswith("## ") and "Gấc" in ls:
            crop, out[crop] = "Gấc", []
            continue
        if not crop or not ls.startswith("|"):
            continue
        cells = [c.strip() for c in ls.strip("|").split("|")]
        if len(cells) < 5:
            continue
        if cells[0].lower() in ("bước", "") or set(cells[0]) <= {"-", " "}:
            continue  # dòng header hoặc dòng kẻ "---"
        buoc, mota, congha, tansuat, phamvi = cells[:5]
        if "quay về" in mota.lower():
            continue  # marker lặp chu kỳ
        if phamvi in ("—", "-", ""):
            continue  # không có lịch
        out[crop].append({
            "Bước": int(buoc) if buoc.isdigit() else buoc, "Mô tả": mota,
            "Công/ha": _num(congha), "Tần suất": tansuat, "Phạm vi": phamvi,
        })
    return out


def import_from_markdown(path=None, replace=True):
    """Đọc file quy trình (.md) và tạo Cultivation Process cho Sâm + Gấc. Idempotent (replace)."""
    import os

    if not path:
        # docs/ nằm ở gốc repo; app được mount/symlink, đi lên từ app_path
        app_path = frappe.get_app_path("akf_farm")  # .../akf_farm/akf_farm
        path = os.path.abspath(os.path.join(app_path, "..", "..", "docs", "quy-trinh-canh-tac.md"))
    with open(path, encoding="utf-8") as f:
        tables = parse_markdown_tables(f.read())
    created = {}
    for crop, rows in tables.items():
        name = f"Quy trình {crop}"
        if frappe.db.exists("Cultivation Process", name):
            if not replace:
                continue
            frappe.delete_doc("Cultivation Process", name, force=True)
        import_rows(name, crop, rows)
        created[name] = len(rows)
    frappe.db.commit()
    return created


@frappe.whitelist()
def import_file(process_name, crop, file_url):
    import openpyxl

    path = frappe.get_site_path(file_url.lstrip("/"))
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    headers = [c.value for c in ws[1]]
    rows = [dict(zip(headers, [c.value for c in row], strict=False)) for row in ws.iter_rows(min_row=2)]
    return import_rows(process_name, crop, rows)
