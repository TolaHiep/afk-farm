# Thiết kế: Ảnh thật (chụp/tải lên + offline)

Ngày: 2026-06-18
Trạng thái: Chờ user review

## Bối cảnh & vấn đề

Hiện tính năng ảnh ở mobile **hoàn toàn là giả**:
- `TaskDetail` (hoàn thành việc) và `MobileSupport` (yêu cầu hỗ trợ): nút "Chụp ảnh" chỉ bật/tắt một biến boolean `hasPhoto`, không mở camera, không có `<input type="file">`.
- `DailyReport` (báo cáo bất thường): "ảnh" gửi lên là **một URL ảnh stock Unsplash cố định**.
- Backend không có chỗ lưu ảnh thật; frontend không có hàm upload.

Hệ quả: ràng buộc "bắt buộc chụp ảnh" (`require_photo`, báo cáo bất thường) bị qua mặt — nghiệm thu/bằng chứng bằng ảnh **không có giá trị thực**.

Mục tiêu: cho phép tổ trưởng **chụp/chọn ảnh thật**, lưu bền ở backend, hiển thị lại; **hoạt động cả khi offline** (đồng bộ khi có mạng).

## Quyết định đã chốt (locked)

1. **Phạm vi:** chỉ làm ảnh thật cho 3 luồng: hoàn thành việc (`complete_task`), báo cáo bất thường (`submit_report`), yêu cầu hỗ trợ (`submit_support`). SOP/email/logo/push là spec riêng, KHÔNG làm ở đây.
2. **Cách lưu/tải:** nén ảnh thành **chuỗi base64 (data URL)**, gửi qua mảng `photos: string[]` sẵn có. Backend decode → lưu file. (Không dùng multipart `upload_file` vì offline sẽ phức tạp.)
3. **Chất lượng (sàn = HD):**
   - Online: cạnh dài **1920px (Full HD), JPEG q0.85**.
   - Offline / mức tối thiểu: cạnh dài **1280px (HD 720p), JPEG q0.8**. Không bao giờ xuống dưới HD.
4. **Quyền xem:** file **private**, đính kèm đúng bản ghi (Farm Task / Team Leader Report / Support Request).
5. **Số lượng:** nhiều ảnh, **trần 5 ảnh/lần**.

## Mô hình dữ liệu

**Không đổi schema.** Cả 3 DocType đã có bảng con `photos` (fieldtype Table, options **"Farm Task Photo"**); `Farm Task Photo` có field `image`. Ta lưu `file_url` vào `image` như hiện tại — chỉ khác là `file_url` giờ trỏ tới file thật thay vì URL ngoài.

File vật lý nằm trong `sites/akf.localhost/private/files/` (bền theo Docker volume `sites`, đã nằm trong `bench backup`).

## Frontend

### Util mới `frontend/src/lib/image.ts`
Đơn vị độc lập, thuần (test được), không phụ thuộc React:

- `compressImage(file: File, maxDim: number, quality: number): Promise<string>`
  - Đọc `file` → `createImageBitmap(file, { imageOrientation: "from-image" })` để **tôn trọng EXIF orientation** (ảnh dọc không bị xoay sai).
  - Tính tỉ lệ: nếu `max(w,h) > maxDim` thì scale về `maxDim` theo cạnh dài, giữ tỉ lệ; nhỏ hơn thì giữ nguyên (không phóng to).
  - Vẽ lên `<canvas>` → `canvas.toDataURL("image/jpeg", quality)` → trả data URL.
- `dataUrlBytes(dataUrl: string): number` — ước lượng số byte thực của data URL (phần base64 sau dấu phẩy × 3/4).
- Hằng số export:
  - `ONLINE = { maxDim: 1920, quality: 0.85 }`
  - `OFFLINE = { maxDim: 1280, quality: 0.8 }`  // sàn HD
- `MAX_PHOTOS = 5`

### Bộ chọn ảnh (3 màn: TaskDetail, DailyReport, MobileSupport)
Thay nút "Chụp ảnh" giả bằng:
- `<input type="file" accept="image/*" multiple hidden ref=...>` + nút bấm kích hoạt (cho chọn camera hoặc thư viện).
- State giữ **File gốc**: `const [files, setFiles] = useState<File[]>([])`.
- Khi chọn: gộp vào `files`, cắt còn tối đa `MAX_PHOTOS` (nếu vượt → `alert` báo trần). Hiện **thumbnail** bằng `URL.createObjectURL(file)` + nút "x" để xóa từng ảnh. `revokeObjectURL` khi gỡ/unmount.
- Điều kiện bắt buộc ảnh đổi từ `hasPhoto` (boolean) sang **`files.length > 0`**:
  - `TaskDetail`: nếu `task.requirePhoto && files.length === 0` → chặn, báo "Cần chụp ảnh trước khi hoàn thành".
  - `DailyReport`: bất thường yêu cầu `files.length > 0`.
  - `MobileSupport`: ảnh tùy chọn.

### Luồng gửi
Hàm dùng chung trong từng component (hoặc helper `prepareAndSubmit`):

1. **Online (thử trước):** `const photos = await Promise.all(files.map(f => compressImage(f, ONLINE.maxDim, ONLINE.quality)))` → gọi API tương ứng (`completeTask` / `submitReport` / `submitSupport`) với `photos`.
2. **Bắt lỗi:** nếu `isNetworkError(e)` (mất mạng):
   - Nén lại **từ File gốc** ở mức OFFLINE: `const small = await Promise.all(files.map(f => compressImage(f, OFFLINE.maxDim, OFFLINE.quality)))` (nén lại từ gốc, KHÔNG nén chồng lên ảnh online → tránh mất nét 2 lần).
   - **Guardrail dung lượng:** `const adding = small.reduce((s,d)=>s+dataUrlBytes(d),0)`; nếu `currentQueueBytes() + adding > OFFLINE_BUDGET` (≈ 4.5 MB) → `alert` báo hàng đợi offline gần đầy, **không** enqueue (yêu cầu thử lại khi có mạng / bớt ảnh). Ngược lại `enqueueOffline({... payload: { ..., photos: small } })`.
   - Lỗi nghiệp vụ (ApiError) → hiển thị lỗi như cũ, không enqueue.

`lib/offline.ts` **không đổi logic**: payload chứa mảng `photos` là chuỗi base64 → tự serialize vào `localStorage` và replay qua `completeTask/submitReport/submitSupport` như cũ (backend idempotent theo `client_uuid`). Bổ sung 1 hàm tiện ích `currentQueueBytes()` (tính `JSON.stringify(read()).length`) để guardrail dùng; hằng `OFFLINE_BUDGET` đặt trong `offline.ts`.

### Hiển thị
`file_url` private dạng `/private/files/...`; `<img src={file_url}>` same-origin tự gửi cookie phiên → Frappe kiểm quyền theo bản ghi đính kèm (tổ trưởng xem ảnh của mình qua `if_owner`; admin/System Manager xem tất cả). Các màn đã render mảng photos (`MobileReportHistory`, `CropCycleManagement`, `SupportRequests`, `AnomalyDetail`) chỉ cần nhận đúng URL — kiểm tra lại để chắc chúng dùng phần tử mảng làm `src` trực tiếp.

## Backend (`akf_farm/api/field_api.py`)

### Helper chung
Tạo `File` doc tường minh + `insert(ignore_permissions=True)` (KHÔNG dùng `save_file(..., ignore_permissions=...)` vì kwarg đó không ổn định giữa các bản Frappe; tổ trưởng quyền hạn chế nên cần bỏ kiểm quyền tường minh). File doc nhận `content` (bytes) sẽ tự ghi file ra đĩa khi insert:
```python
import base64, re

_DATA_URL = re.compile(r"^data:image/(\w+);base64,(.+)$", re.DOTALL)

def _save_photos(parent_doc, photos):
    """Đổi mỗi data URL base64 thành file private đính vào parent_doc; giữ nguyên URL đã có (replay)."""
    urls = []
    for i, p in enumerate(_as_list(photos)):
        if not isinstance(p, str):
            continue
        m = _DATA_URL.match(p)
        if not m:
            urls.append(p)  # đã là file_url (replay trùng) hoặc URL ngoài -> giữ
            continue
        ext, b64 = m.group(1), m.group(2)
        content = base64.b64decode(b64)
        ext = "jpg" if ext == "jpeg" else ext
        _file = frappe.get_doc({
            "doctype": "File",
            "file_name": f"{parent_doc.doctype}-{parent_doc.name}-{i}.{ext}",
            "attached_to_doctype": parent_doc.doctype,
            "attached_to_name": parent_doc.name,
            "is_private": 1,
            "content": content,
        }).insert(ignore_permissions=True)
        urls.append(_file.file_url)
    return urls
```

### `complete_task` (sửa)
Sau khi qua chốt sở hữu + chốt `require_photo` (đã có), thay khối set photos:
```python
doc.status = "completed"
doc.client_uuid = client_uuid
urls = _save_photos(doc, photos)            # doc đã tồn tại -> có name
doc.set("photos", [{"image": u} for u in urls])
doc.save(ignore_permissions=True)
doc.db_set("completed_on", str(getdate()))
```
Idempotency giữ nguyên: nhánh `client_uuid == doc.client_uuid and status == completed` return **trước** khi lưu ảnh → replay không tạo file trùng.

### `submit_report` / `submit_support` (sửa)
Cần `name` trước khi đính file → **insert trước, đính ảnh sau**:
```python
doc = frappe.get_doc({... , "photos": []}).insert(ignore_permissions=True)
urls = _save_photos(doc, photos)
if urls:
    doc.set("photos", [{"image": u} for u in urls])
    doc.save(ignore_permissions=True)
return {"ok": True, "name": doc.name}
```
Idempotency (`submit_report` kiểm tra `client_uuid` tồn tại; `submit_support` không có) giữ nguyên — replay `submit_report` trùng return trước insert nên không upload lại.

`require_photo` của `complete_task` và bắt buộc ảnh báo cáo bất thường vẫn validate ở backend như hiện tại (`photos` rỗng → throw).

## Hạ tầng
- **Không cần đổi nginx:** `frontend/nginx.conf` (prod) đã có `client_max_body_size 25m` và đã proxy `/private/` → backend. Dev qua Vite proxy không giới hạn.
- **Không migrate** (không đổi DocType).

## Xử lý lỗi
- Nén ảnh lỗi (file hỏng/không phải ảnh) → `alert`, bỏ ảnh đó, không chặn các ảnh khác.
- Vượt trần 5 ảnh → `alert`, cắt bớt.
- Hàng đợi offline vượt ngân sách → `alert`, không enqueue.
- Backend decode lỗi 1 phần tử → bỏ qua phần tử đó (không làm hỏng cả request); phần tử hợp lệ vẫn lưu.

## Kiểm thử

### Backend (`api/test_api_field.py`, chạy dưới quyền tổ trưởng — xem [[frappe-tests-run-as-administrator]])
- `complete_task` với 1 data URL base64 PNG nhỏ → tạo `File` (is_private=1) đính vào Farm Task, bảng con `photos` có `image` = `file_url` thật (`/private/files/...`).
- Replay `complete_task` cùng `client_uuid` sau khi đã completed → **không** tạo file thứ 2.
- `submit_report` với base64 → File đính vào report; replay cùng `client_uuid` → 1 báo cáo, không nhân đôi file.
- `submit_support` với base64 → File đính vào support request.
- Gửi phần tử đã là `file_url` (giả lập replay) → giữ nguyên, không tạo file mới.

### Frontend (`lib/image.test.ts`, vitest)
- `dataUrlBytes` tính đúng số byte (so với độ dài base64 đã biết).
- `compressImage` trả chuỗi bắt đầu `data:image/jpeg;base64,` và (nếu jsdom hỗ trợ canvas hạn chế) kiểm tra logic tính tỉ lệ resize bằng hàm thuần tách riêng `scaledSize(w, h, maxDim)` (không phụ thuộc canvas) → test dễ và chắc.
- Guardrail: hàm thuần `withinBudget(queueBytes, addingBytes, budget)` trả đúng true/false ở các mốc.

## Phạm vi KHÔNG làm (YAGNI)
- SOP "Hướng dẫn thực hiện", gửi email (SMTP), tải logo, push notification — spec/đợt riêng.
- Không chỉnh sửa/crop ảnh trong app.
- Không upload nền (background) hay nén phía server.
- Không đổi cơ chế hàng đợi offline (vẫn localStorage; base64 nằm trong payload).
