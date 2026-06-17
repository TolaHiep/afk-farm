# Thiết kế: Nhập quy trình canh tác từ Excel (tải mẫu + upload tự nhận diện)

Ngày: 2026-06-17
Trạng thái: Đã duyệt thiết kế, chờ review spec

## Bối cảnh & vấn đề

Trang Quản lý quy trình hiện chỉ tạo quy trình + bước thủ công qua modal (`ProcessManagement.tsx`).
Người dùng muốn: **tải file Excel mẫu** về, điền các bước, rồi **upload lên — hệ thống tự
nhận diện và tạo quy trình** (đọc tên + cây + các bước từ file). Backend đã có sẵn một phần:
`import_rows()` (tạo Cultivation Process + steps từ list dict) và `parse_frequency()` (hiểu tần
suất tiếng Việt như "20 ngày/lần"), nhưng `import_file()` hiện yêu cầu truyền sẵn `process_name`
+ `crop`, và chưa có UI tải mẫu / upload.

Phạm vi chốt: **mỗi file một quy trình** (không đa sheet). Tên + cây đọc TỪ TRONG file.

## Mô hình dữ liệu liên quan (đã có)

- `Cultivation Process`: process_name (Data, unique, autoname), crop (Select: `\nGấc\nSâm`), steps (Table).
- `Cultivation Step` (child): step (Int), description (Data, reqd), mandays_per_ha (Float),
  frequency_type (Select: one_time/daily/every_n_days/n_per_day), frequency_value (Int),
  scope (Select: per_crop/shared), require_photo (Check).
- `engine/frequency.py::parse_frequency(text) -> (type, value)` — đã test, hiểu tiếng Việt.
- `api/sheet_import.py::import_rows(process_name, crop, rows)` — tạo process từ list dict với
  key tiếng Việt: "Bước", "Mô tả", "Công/ha", "Tần suất", "Phạm vi". Map Phạm vi qua `SCOPE_MAP`.

## Mẫu Excel (layout cố định)

Backend tự sinh bằng openpyxl để cột luôn khớp importer:

```
A1: Tên quy trình   | B1: Quy trình Gấc      (người dùng sửa)
A2: Cây             | B2: Gấc                (Gấc hoặc Sâm)
(dòng 3 trống)
dòng 4 (header): Bước | Mô tả | Công/ha | Tần suất | Phạm vi | Yêu cầu ảnh
dòng 5+ (mẫu):   1 | Đào hố trồng 60x60cm | 2 | 1 lần/20 năm | Theo cây |
                 2 | Tưới mát | | 2 lần/ngày | Dùng chung |
```

- **Tần suất**: điền tiếng Việt tự nhiên → `parse_frequency` tự hiểu. Trống → one_time.
- **Phạm vi**: "Theo cây" → per_crop, "Dùng chung" → shared. Trống → mặc định per_crop.
- **Yêu cầu ảnh**: trống/"0"/"không" → false; "x"/"có"/"1"/"yes" → true.
- File mẫu có sẵn 2-3 dòng ví dụ để người dùng thấy định dạng.

## Backend — `api/sheet_import.py`

### Refactor dùng chung
- Tách `_truthy(v) -> bool` cho cột Yêu cầu ảnh.
- `import_rows` thêm xử lý `require_photo` (đọc key "Yêu cầu ảnh" nếu có; mặc định 0) — không phá
  caller hiện tại (md import không có cột này → mặc định false).

### `parse_workbook(wb) -> (process_name, crop, rows)`
- Đọc ô **B1** = tên quy trình, **B2** = cây.
- Tìm dòng header: dòng đầu tiên có ô đầu == "Bước" (không phân biệt hoa thường, sau khi strip).
- Từ dòng sau header: mỗi dòng có "Mô tả" không rỗng → 1 row dict
  {Bước, Mô tả, Công/ha, Tần suất, Phạm vi, Yêu cầu ảnh}. Bỏ dòng "Mô tả" rỗng.
- Validate: tên không rỗng; cây ∈ {Gấc, Sâm}; ít nhất 1 bước. Sai → `frappe.throw(<tiếng Việt>)`.

### `@frappe.whitelist() process_template()` (GET)
- Dựng workbook mẫu (meta + header + ví dụ), ghi ra BytesIO.
- Trả file tải về qua `frappe.response`: `frappe.response["filename"]="mau-quy-trinh.xlsx"`,
  `frappe.response["filecontent"]=<bytes>`, `frappe.response["type"]="binary"`. Frontend tải bằng thẻ <a>.

### `@frappe.whitelist() import_process_excel(file_b64, replace=0)` (POST)
- `base64.b64decode(file_b64)` → `BytesIO` → `openpyxl.load_workbook`.
- `parse_workbook` → (name, crop, rows).
- Nếu `frappe.db.exists("Cultivation Process", name)` và `int(replace) == 0`:
  trả `{"exists": True, "name": name}` (KHÔNG tạo, KHÔNG xóa).
- Nếu tồn tại và `replace=1`: `frappe.delete_doc("Cultivation Process", name, force=True)`.
- `import_rows(name, crop, rows)`.
- Trả `{"exists": False, "name": name, "crop": crop, "steps": len(rows)}`.

## Frontend — `ProcessManagement.tsx` + `lib/queries.ts`

### queries.ts
- `importProcessExcel(fileB64: string, replace = false)` →
  `api.post("sheet_import.import_process_excel", { file_b64: fileB64, replace: replace ? 1 : 0 })`.
- `PROCESS_TEMPLATE_URL = "/api/method/akf_farm.api.sheet_import.process_template"` (hằng để dùng cho <a>).

### ProcessManagement.tsx
Thêm cạnh nút "Thêm quy trình":
- **"Tải mẫu Excel"**: thẻ `<a href={PROCESS_TEMPLATE_URL}>` (tải trực tiếp, cùng origin).
- **"Nhập từ Excel"**: `<input type="file" accept=".xlsx" hidden>` + nút bấm mở input.
  - Khi chọn file: đọc base64 (FileReader.readAsDataURL → cắt phần `data:...;base64,`),
    gọi `importProcessExcel(b64)`.
  - Nếu kết quả `{exists: true}` → mở `ConfirmDialog` "Quy trình \"X\" đã tồn tại — ghi đè?";
    đồng ý → gọi lại `importProcessExcel(b64, true)`.
  - Thành công → `reload(name)` + thông báo "Đã nhập \"X\" (N bước)". Reset input value.
  - Lỗi → `alert(message)` (giữ pattern alert hiện có trong file).

State mới: `importing` (bool, khoá nút khi đang xử lý), `pendingB64` (giữ base64 để gọi lại khi
ghi đè), `confirmOverwrite: { name: string } | null`.

## Luồng dữ liệu (end-to-end)

1. Tải mẫu: <a> → `process_template` → file xlsx về máy.
2. Người dùng điền → upload: file → base64 → `import_process_excel` →
   `parse_workbook` → (tồn tại? hỏi ghi đè) → `import_rows` → process + steps trong DB →
   reload danh sách.

## Xử lý lỗi
- Thiếu/ sai ô tên, cây không hợp lệ, không có bước → `frappe.throw` thông báo tiếng Việt rõ.
- File không phải xlsx / hỏng → openpyxl ném lỗi → bắt và trả thông báo "File không đọc được, hãy
  dùng đúng mẫu .xlsx".
- Trùng tên → cơ chế exists/replace ở trên.

## Phạm vi KHÔNG làm (YAGNI)
- Không hỗ trợ nhiều quy trình trong 1 file / nhiều sheet.
- Không import qua Frappe File doctype (dùng base64 trực tiếp, tránh rác file).
- Không sửa luồng `seed.run()` / `import_from_markdown` (việc riêng).

## Kiểm thử
- Backend `test_sheet_import.py` (mở rộng):
  - `parse_workbook`: dựng workbook in-memory đúng layout → trả đúng (name, crop, rows) gồm
    require_photo; workbook thiếu tên / cây sai / không bước → throw.
  - `import_process_excel`: tạo process + đúng số bước; trùng tên + replace=0 → `{exists: true}`,
    không đổi DB; replace=1 → ghi đè.
  - `process_template`: gọi không lỗi, trả bytes mở lại được bằng openpyxl, có header đúng.
- Frontend: verify `tsc` (file đổi) + thử tay (tải mẫu, điền, upload, ghi đè).
