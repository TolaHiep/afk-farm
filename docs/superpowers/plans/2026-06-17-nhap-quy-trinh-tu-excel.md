# Nhập quy trình canh tác từ Excel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép người dùng tải file Excel mẫu ở trang Quản lý quy trình, điền các bước, upload lên và hệ thống tự đọc tên + cây + các bước để tạo quy trình.

**Architecture:** Mở rộng `api/sheet_import.py` (backend Frappe): thêm hàm sinh file mẫu, hàm đọc workbook (tên ở B1, cây ở B2, bảng bước), và endpoint upload nhận base64. Frontend `ProcessManagement.tsx` thêm nút "Tải mẫu Excel" (link tải) và "Nhập từ Excel" (upload base64 + hỏi ghi đè khi trùng tên). Tái dùng `import_rows` + `parse_frequency` đã có.

**Tech Stack:** Frappe v15 / Python + openpyxl 3.1.5 (có sẵn trong venv bench); React 18 + TypeScript (frontend).

## Global Constraints

- Chữ tiếng Việt (tên cây "Gấc"/"Sâm", header cột, chuỗi UI) phải giữ **đúng dấu** (UTF-8).
- **Không** thêm thư viện mới. openpyxl đã có trong venv bench — `import openpyxl` đặt **bên trong hàm** (theo đúng pattern `import_file` hiện tại), không import ở đầu module.
- Upload bằng **base64** trong JSON (API client của app chỉ gửi JSON); **không** dùng Frappe File doctype.
- `import_process_excel` **KHÔNG** gọi `frappe.db.commit()` — để Frappe tự commit theo request; gọi commit sẽ phá rollback của `FrappeTestCase`.
- Không sửa DocType `.json` → **không cần migrate**.
- DocType liên quan: `Cultivation Process` (process_name unique autoname, crop Select `\nGấc\nSâm`, steps Table), `Cultivation Step` (step, description reqd, mandays_per_ha, frequency_type, frequency_value, scope, require_photo).
- Test backend chạy trong container: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'`. Nếu báo allow_tests, chạy `bench --site akf.localhost set-config allow_tests true` trước.
- Frontend verify ở host: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "ProcessManagement|queries"` (kỳ vọng KHÔNG có dòng nào). Lưu ý: `tsc --noEmit` có sẵn ~11 lỗi cũ ở file UI khác (button.tsx...) — bỏ qua.
- Commit message: ASCII, KHÔNG có ký tự `"` bên trong.
- Backend code bind-mount live (sửa .py thấy ngay, không cần restart). Compose dev đang chạy.

---

## File Structure

**Backend**
- `backend/akf_farm/akf_farm/api/sheet_import.py` — thêm `_truthy`, sửa `import_rows`, thêm `parse_workbook`, `process_template`, `import_process_excel`. (Modify)
- `backend/akf_farm/akf_farm/api/test_sheet_import.py` — thêm test cho các hàm trên. (Modify)

**Frontend**
- `frontend/src/lib/queries.ts` — thêm `importProcessExcel` + hằng `PROCESS_TEMPLATE_URL`. (Modify)
- `frontend/src/components/admin/ProcessManagement.tsx` — thêm 2 nút + upload + hỏi ghi đè. (Modify)

---

## Task 1: Backend — `import_rows` đọc cột "Yêu cầu ảnh"

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/sheet_import.py` (thêm `_truthy`, sửa `import_rows`)
- Modify: `backend/akf_farm/akf_farm/api/test_sheet_import.py`

**Interfaces:**
- Produces: `_truthy(v) -> bool`; `import_rows` thêm `require_photo` vào mỗi step (mặc định 0 nếu không có cột).

- [ ] **Step 1: Viết test thất bại — thêm vào `test_sheet_import.py`**

```python
    def test_import_rows_require_photo(self):
        if frappe.db.exists("Cultivation Process", "QT Photo IMP"):
            frappe.delete_doc("Cultivation Process", "QT Photo IMP")
        rows = [
            {"Bước": 1, "Mô tả": "Có ảnh", "Tần suất": "Hàng ngày", "Phạm vi": "Dùng chung", "Yêu cầu ảnh": "x"},
            {"Bước": 2, "Mô tả": "Không ảnh", "Tần suất": "Hàng ngày", "Phạm vi": "Dùng chung", "Yêu cầu ảnh": ""},
        ]
        name = import_rows("QT Photo IMP", "Gấc", rows)
        doc = frappe.get_doc("Cultivation Process", name)
        self.assertEqual(doc.steps[0].require_photo, 1)
        self.assertEqual(doc.steps[1].require_photo, 0)
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'`
Expected: FAIL — require_photo mặc định 0 cho cả 2 (cột chưa được đọc).

- [ ] **Step 3: Thêm `_truthy` và sửa `import_rows` trong `sheet_import.py`**

Thêm helper sau dòng `SCOPE_MAP = {...}`:

```python
def _truthy(v):
    return str(v or "").strip().lower() in ("x", "có", "co", "1", "yes", "true", "y")
```

Trong vòng lặp của `import_rows`, sửa phần `steps.append({...})` để thêm `require_photo`:

```python
        steps.append({
            "step": r.get("Bước", i), "description": r["Mô tả"],
            "mandays_per_ha": r.get("Công/ha", 0), "frequency_type": ftype,
            "frequency_value": fval, "scope": scope,
            "require_photo": 1 if _truthy(r.get("Yêu cầu ảnh", "")) else 0,
        })
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'`
Expected: PASS (gồm test cũ + test mới).

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/sheet_import.py backend/akf_farm/akf_farm/api/test_sheet_import.py
git commit -m "feat: import_rows doc cot Yeu cau anh (require_photo)"
```

---

## Task 2: Backend — `parse_workbook`

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/sheet_import.py`
- Modify: `backend/akf_farm/akf_farm/api/test_sheet_import.py`

**Interfaces:**
- Consumes: openpyxl (workbook đối tượng).
- Produces: `parse_workbook(wb) -> (name: str, crop: str, rows: list[dict])`. `rows` dùng key tiếng Việt khớp `import_rows` ("Bước","Mô tả","Công/ha","Tần suất","Phạm vi","Yêu cầu ảnh"). Ném `frappe.throw` khi thiếu tên / cây sai / không có bước / không thấy dòng header.

- [ ] **Step 1: Viết test thất bại — thêm helper + test vào `test_sheet_import.py`**

Thêm import ở đầu file (cạnh import có sẵn):

```python
import openpyxl
from akf_farm.api import sheet_import
```

Thêm helper dựng workbook (đặt ở mức module, dưới phần import):

```python
def _build_wb(name="Quy trình Test", crop="Gấc", data=None):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws["A1"], ws["B1"] = "Tên quy trình", name
    ws["A2"], ws["B2"] = "Cây", crop
    header = ["Bước", "Mô tả", "Công/ha", "Tần suất", "Phạm vi", "Yêu cầu ảnh"]
    for col, h in enumerate(header, start=1):
        ws.cell(row=4, column=col, value=h)
    if data is None:
        data = [
            [1, "Đào hố", 2, "1 lần/20 năm", "Theo cây", ""],
            [2, "Tưới mát", "", "2 lần/ngày", "Dùng chung", "x"],
        ]
    for ri, r in enumerate(data, start=5):
        for ci, v in enumerate(r, start=1):
            ws.cell(row=ri, column=ci, value=v)
    return wb
```

Thêm test class:

```python
class TestParseWorkbook(FrappeTestCase):
    def test_parse_ok(self):
        name, crop, rows = sheet_import.parse_workbook(_build_wb())
        self.assertEqual(name, "Quy trình Test")
        self.assertEqual(crop, "Gấc")
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["Mô tả"], "Đào hố")
        self.assertEqual(str(rows[1]["Yêu cầu ảnh"]).strip().lower(), "x")

    def test_parse_missing_name_throws(self):
        with self.assertRaises(frappe.exceptions.ValidationError):
            sheet_import.parse_workbook(_build_wb(name=""))

    def test_parse_bad_crop_throws(self):
        with self.assertRaises(frappe.exceptions.ValidationError):
            sheet_import.parse_workbook(_build_wb(crop="Lúa"))

    def test_parse_no_rows_throws(self):
        with self.assertRaises(frappe.exceptions.ValidationError):
            sheet_import.parse_workbook(_build_wb(data=[]))
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'`
Expected: FAIL — `parse_workbook` chưa tồn tại.

- [ ] **Step 3: Thêm `parse_workbook` vào `sheet_import.py`**

```python
def parse_workbook(wb):
    """Đọc workbook mẫu: B1=tên quy trình, B2=cây, dòng header 'Bước', rồi các bước.

    Trả (name, crop, rows) với rows = list dict key tiếng Việt khớp import_rows.
    """
    ws = wb.active
    name = str(ws["B1"].value or "").strip()
    crop = str(ws["B2"].value or "").strip()

    header_row, headers = None, []
    for row in ws.iter_rows(min_row=1):
        if str(row[0].value or "").strip().lower() == "bước":
            header_row = row[0].row
            headers = [str(c.value or "").strip() for c in row]
            break
    if header_row is None:
        frappe.throw("Không tìm thấy dòng tiêu đề 'Bước' trong file.")

    rows = []
    for vals in ws.iter_rows(min_row=header_row + 1, values_only=True):
        rec = {headers[i]: vals[i] for i in range(len(headers)) if i < len(vals)}
        if not str(rec.get("Mô tả", "") or "").strip():
            continue
        rows.append(rec)

    if not name:
        frappe.throw("Thiếu Tên quy trình (ô B1).")
    if crop not in ("Gấc", "Sâm"):
        frappe.throw("Cây phải là 'Gấc' hoặc 'Sâm' (ô B2).")
    if not rows:
        frappe.throw("File chưa có bước nào (cột Mô tả trống).")
    return name, crop, rows
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/sheet_import.py backend/akf_farm/akf_farm/api/test_sheet_import.py
git commit -m "feat: parse_workbook doc ten/cay/buoc tu file excel"
```

---

## Task 3: Backend — endpoint `import_process_excel`

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/sheet_import.py`
- Modify: `backend/akf_farm/akf_farm/api/test_sheet_import.py`

**Interfaces:**
- Consumes: `parse_workbook`, `import_rows`.
- Produces: `import_process_excel(file_b64, replace=0) -> dict`. Trùng tên + replace=0 → `{"exists": True, "name": name}`. Ngược lại tạo (xóa cũ nếu replace=1) → `{"exists": False, "name", "crop", "steps": <int>}`.

- [ ] **Step 1: Viết test thất bại — thêm vào `test_sheet_import.py`**

```python
def _b64(wb):
    import io, base64
    bio = io.BytesIO()
    wb.save(bio)
    return base64.b64encode(bio.getvalue()).decode()


class TestImportProcessExcel(FrappeTestCase):
    def test_import_creates(self):
        if frappe.db.exists("Cultivation Process", "QT Excel A"):
            frappe.delete_doc("Cultivation Process", "QT Excel A", force=True)
        res = sheet_import.import_process_excel(_b64(_build_wb(name="QT Excel A", crop="Sâm")))
        self.assertEqual(res["exists"], False)
        self.assertEqual(res["name"], "QT Excel A")
        self.assertEqual(res["steps"], 2)
        self.assertTrue(frappe.db.exists("Cultivation Process", "QT Excel A"))

    def test_duplicate_without_replace_returns_exists(self):
        if not frappe.db.exists("Cultivation Process", "QT Excel B"):
            sheet_import.import_process_excel(_b64(_build_wb(name="QT Excel B", crop="Gấc")))
        res = sheet_import.import_process_excel(_b64(_build_wb(name="QT Excel B", crop="Gấc")))
        self.assertEqual(res["exists"], True)
        self.assertEqual(res["name"], "QT Excel B")

    def test_replace_overwrites(self):
        if not frappe.db.exists("Cultivation Process", "QT Excel C"):
            sheet_import.import_process_excel(_b64(_build_wb(name="QT Excel C", crop="Gấc")))
        one_row = [[1, "Chỉ một bước", 1, "Hàng ngày", "Dùng chung", ""]]
        res = sheet_import.import_process_excel(_b64(_build_wb(name="QT Excel C", crop="Gấc", data=one_row)), replace=1)
        self.assertEqual(res["exists"], False)
        self.assertEqual(res["steps"], 1)
        doc = frappe.get_doc("Cultivation Process", "QT Excel C")
        self.assertEqual(len(doc.steps), 1)
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'`
Expected: FAIL — `import_process_excel` chưa tồn tại.

- [ ] **Step 3: Thêm `import_process_excel` vào `sheet_import.py`**

```python
@frappe.whitelist()
def import_process_excel(file_b64, replace=0):
    """Nhận file xlsx (base64), đọc + tạo Cultivation Process. Trùng tên: cần replace=1 để ghi đè."""
    import base64
    import io
    import openpyxl

    try:
        raw = base64.b64decode(file_b64)
        wb = openpyxl.load_workbook(io.BytesIO(raw), data_only=True)
    except Exception:
        frappe.throw("File không đọc được — hãy dùng đúng mẫu .xlsx.")

    name, crop, rows = parse_workbook(wb)
    if frappe.db.exists("Cultivation Process", name):
        if not int(replace or 0):
            return {"exists": True, "name": name}
        frappe.delete_doc("Cultivation Process", name, force=True)
    import_rows(name, crop, rows)
    return {"exists": False, "name": name, "crop": crop, "steps": len(rows)}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/sheet_import.py backend/akf_farm/akf_farm/api/test_sheet_import.py
git commit -m "feat: endpoint import_process_excel (base64, hoi ghi de)"
```

---

## Task 4: Backend — endpoint `process_template` (file mẫu tải về)

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/sheet_import.py`
- Modify: `backend/akf_farm/akf_farm/api/test_sheet_import.py`

**Interfaces:**
- Consumes: openpyxl; `parse_workbook` (cho test round-trip).
- Produces: `process_template()` — set `frappe.response` để trả file `mau-quy-trinh.xlsx`. File mẫu hợp lệ: B1 nhãn "Tên quy trình", header dòng 4 đúng 6 cột, vài dòng ví dụ → `parse_workbook` đọc được.

- [ ] **Step 1: Viết test thất bại — thêm vào `test_sheet_import.py`**

```python
class TestProcessTemplate(FrappeTestCase):
    def test_template_valid_and_roundtrip(self):
        import io
        sheet_import.process_template()
        content = frappe.response.get("filecontent")
        self.assertTrue(content)
        self.assertEqual(frappe.response.get("filename"), "mau-quy-trinh.xlsx")
        wb = openpyxl.load_workbook(io.BytesIO(content))
        ws = wb.active
        self.assertEqual(ws["A1"].value, "Tên quy trình")
        self.assertEqual(ws["A2"].value, "Cây")
        self.assertEqual(
            [ws.cell(row=4, column=c).value for c in range(1, 7)],
            ["Bước", "Mô tả", "Công/ha", "Tần suất", "Phạm vi", "Yêu cầu ảnh"],
        )
        # File mẫu phải đọc được bằng chính parse_workbook
        name, crop, rows = sheet_import.parse_workbook(wb)
        self.assertEqual(crop, "Gấc")
        self.assertTrue(len(rows) >= 1)
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'`
Expected: FAIL — `process_template` chưa tồn tại.

- [ ] **Step 3: Thêm `process_template` vào `sheet_import.py`**

```python
@frappe.whitelist()
def process_template():
    """Sinh file Excel mẫu để người dùng tải về, điền rồi upload lại."""
    import io
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Quy trình"
    ws["A1"], ws["B1"] = "Tên quy trình", "Quy trình Gấc"
    ws["A2"], ws["B2"] = "Cây", "Gấc"
    header = ["Bước", "Mô tả", "Công/ha", "Tần suất", "Phạm vi", "Yêu cầu ảnh"]
    for col, h in enumerate(header, start=1):
        ws.cell(row=4, column=col, value=h)
    samples = [
        [1, "Đào hố trồng 60x60cm", 2, "1 lần/20 năm", "Theo cây", ""],
        [2, "Bón phân nước định kỳ", 2, "60 ngày/lần", "Theo cây", ""],
        [3, "Tưới mát", "", "2 lần/ngày", "Dùng chung", ""],
        [4, "Kiểm tra sâu, bệnh", "", "Hàng ngày", "Dùng chung", "x"],
    ]
    for ri, r in enumerate(samples, start=5):
        for ci, v in enumerate(r, start=1):
            ws.cell(row=ri, column=ci, value=v)

    bio = io.BytesIO()
    wb.save(bio)
    frappe.response["filename"] = "mau-quy-trinh.xlsx"
    frappe.response["filecontent"] = bio.getvalue()
    frappe.response["type"] = "binary"
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'`
Expected: PASS (toàn bộ module).

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/sheet_import.py backend/akf_farm/akf_farm/api/test_sheet_import.py
git commit -m "feat: endpoint process_template sinh file excel mau"
```

---

## Task 5: Frontend — nút Tải mẫu + Nhập từ Excel ở trang Quản lý quy trình

**Files:**
- Modify: `frontend/src/lib/queries.ts`
- Modify: `frontend/src/components/admin/ProcessManagement.tsx`

**Interfaces:**
- Consumes: `import_process_excel` / `process_template` (Task 3/4); `ConfirmDialog` (đã có trong `../ui/FormModal`); `getProcesses`/`reload` (đã có).
- Produces: `importProcessExcel(fileB64, replace?)` + `PROCESS_TEMPLATE_URL` trong queries; UI 2 nút trong `ProcessManagement`.

- [ ] **Step 1: Thêm vào `queries.ts`**

Thêm sau nhóm CRUD quy trình (cạnh `createProcess`):

```ts
// Nhập quy trình từ Excel
export const PROCESS_TEMPLATE_URL = "/api/method/akf_farm.api.sheet_import.process_template";
export const importProcessExcel = (fileB64: string, replace = false) =>
  api.post("sheet_import.import_process_excel", { file_b64: fileB64, replace: replace ? 1 : 0 }) as
    Promise<{ exists: boolean; name: string; crop?: string; steps?: number }>;
```

- [ ] **Step 2: Thêm import + state vào `ProcessManagement.tsx`**

Sửa dòng import từ queries để thêm 2 tên mới:

```ts
import { getProcesses, createProcess, updateProcess, deleteProcess as apiDeleteProcess, importProcessExcel, PROCESS_TEMPLATE_URL } from "../../lib/queries";
```

Thêm icon vào import lucide (dòng `import { Plus, Edit2, Trash2 } ...`):

```ts
import { Plus, Edit2, Trash2, Upload, Download } from "lucide-react";
```

Thêm state trong component `ProcessManagement` (sau dòng `const [confirm, ...]`):

```ts
  const [importing, setImporting] = React.useState(false);
  const [overwrite, setOverwrite] = React.useState<{ name: string; b64: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
```

- [ ] **Step 3: Thêm hàm đọc base64 + xử lý upload trong component**

Thêm trong `ProcessManagement` (cạnh các hàm khác, trước `return`):

```ts
  const readB64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result);
        resolve(s.slice(s.indexOf(",") + 1)); // bỏ tiền tố data:...;base64,
      };
      r.onerror = () => reject(new Error("Không đọc được file"));
      r.readAsDataURL(file);
    });

  const doImport = async (b64: string, replace: boolean) => {
    setImporting(true);
    try {
      const res = await importProcessExcel(b64, replace);
      if (res.exists) {
        setOverwrite({ name: res.name, b64 });
      } else {
        setOverwrite(null);
        await reload(res.name);
        alert(`Đã nhập "${res.name}" (${res.steps} bước).`);
      }
    } catch (e) {
      alert("Nhập thất bại: " + (e as Error).message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await readB64(file);
    await doImport(b64, false);
  };
```

- [ ] **Step 4: Thêm 2 nút + input ẩn + ConfirmDialog ghi đè trong JSX**

Sửa khối tiêu đề "Danh sách quy trình" — thay cụm nút bằng:

```tsx
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Danh sách quy trình</h3>
          <div className="flex gap-2">
            <a href={PROCESS_TEMPLATE_URL}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" /> Tải mẫu Excel
            </a>
            <Button variant="secondary" size="sm" disabled={importing} onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> {importing ? "Đang nhập…" : "Nhập từ Excel"}
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={onPickFile} />
            <Button variant="primary" size="sm" onClick={() => setProcModal({ mode: "add", data: emptyProcess() })}>
              <Plus className="w-4 h-4 mr-2" /> Thêm quy trình
            </Button>
          </div>
        </div>
```

Thêm `ConfirmDialog` ghi đè ngay cạnh `ConfirmDialog` xóa hiện có (trước thẻ `</div>` đóng component, cạnh khối `{confirm && ...}`):

```tsx
      {overwrite && (
        <ConfirmDialog
          title={`Quy trình "${overwrite.name}" đã tồn tại — ghi đè?`}
          message="Toàn bộ các bước hiện tại của quy trình này sẽ bị thay bằng nội dung trong file."
          onCancel={() => setOverwrite(null)}
          onConfirm={() => doImport(overwrite.b64, true)}
        />
      )}
```

- [ ] **Step 5: Kiểm tra biên dịch (scoped)**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "ProcessManagement|queries"`
Expected: KHÔNG có dòng nào (chỉ còn ~11 lỗi cũ ở file khác — không liên quan).

- [ ] **Step 6: Kiểm tra tay trên dev (compose đang chạy)**

- Mở `http://localhost:8080` → Quản lý quy trình.
- Bấm **Tải mẫu Excel** → tải về `mau-quy-trinh.xlsx`, mở thấy B1/B2 + bảng mẫu.
- Sửa tên ở B1 thành tên mới, điền vài bước → **Nhập từ Excel** chọn file → thấy quy trình mới xuất hiện + alert "Đã nhập ... (N bước)".
- Upload lại file cùng tên → hiện hộp "đã tồn tại — ghi đè?" → đồng ý → cập nhật.
- Expected: tải mẫu, nhập mới, ghi đè đều chạy.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/queries.ts frontend/src/components/admin/ProcessManagement.tsx
git commit -m "feat: trang quy trinh them Tai mau Excel + Nhap tu Excel"
```

---

## Self-Review (đã thực hiện khi viết plan)

**Spec coverage:**
- Mẫu Excel layout cố định (B1 tên, B2 cây, header dòng 4, ví dụ) → Task 4 `process_template`. ✓
- Đọc tên+cây+bước từ file → Task 2 `parse_workbook`. ✓
- Cột "Yêu cầu ảnh" → Task 1 `import_rows`/`_truthy`. ✓
- Tần suất tiếng Việt tự parse → tái dùng `parse_frequency` (đã có) trong `import_rows`. ✓
- Upload base64, không File doctype → Task 3 `import_process_excel`. ✓
- Trùng tên → hỏi ghi đè (exists/replace) → Task 3 + Task 5 ConfirmDialog. ✓
- 2 nút Tải mẫu / Nhập từ Excel → Task 5. ✓
- Lỗi file/cây/không bước → throw tiếng Việt → Task 2 + Task 3. ✓
- KHÔNG commit trong endpoint (giữ rollback test) → Task 3 ghi rõ. ✓

**Type consistency:** `importProcessExcel(fileB64, replace?)` body `{file_b64, replace}` khớp `import_process_excel(file_b64, replace=0)`; `parse_workbook -> (name, crop, rows)` dùng trong Task 3/4; key rows ("Bước","Mô tả","Công/ha","Tần suất","Phạm vi","Yêu cầu ảnh") nhất quán giữa `_build_wb`, `parse_workbook`, `import_rows`, `process_template`.

**Placeholder scan:** Không có TBD/TODO; mọi step có code/lệnh cụ thể.
