# Thiết kế: Quy trình tường minh — thời gian bắt đầu + bước tiên quyết (thay auto-detect)

Ngày: 2026-06-17
Trạng thái: Đã duyệt thiết kế, chờ review spec
Thay thế: phần "sinh việc theo giai đoạn" (setup_step_indices / setup_done_on) trong spec
`2026-06-17-sinh-viec-theo-giai-doan-design.md` — mô hình heuristic đó bị bỏ.

## Bối cảnh & vấn đề

Cách auto-detect "khối setup = bước one_time liền đầu" sai với dữ liệu thật: các bước thiết lập
(đào hố, gieo...) trong tài liệu ghi "1 lần/20 năm" → `parse_frequency` map thành `every_n_days=7300`,
KHÔNG phải `one_time` → khối setup rỗng → sinh hết 22 việc ngày 1.

Giải pháp: bỏ auto-detect, dùng **khai báo tường minh** cho mỗi bước:
- **Thời gian bắt đầu**: ngay (0) hoặc sau N ngày.
- **Bước tiên quyết** (tùy chọn): bước này chỉ sinh sau khi bước tiên quyết được **đánh dấu hoàn thành**.
- Quy trình có **độ dài chu kỳ** để biết khi nào việc lặp dừng.
- Mỗi chu kỳ sinh task **độc lập** (không lẫn task giữa các chu kỳ).

Mô hình sinh là **event-driven**: bước phụ thuộc chỉ sinh SAU KHI prereq thực sự hoàn thành (không
ước lượng/dự báo). → không cần data "thời lượng bước".

## Mô hình dữ liệu

### Cultivation Process (thêm)
- `cycle_length_days` (Int, default 0). >0 = việc lặp dừng tại `start_date + cycle_length_days`;
  0 = không giới hạn (cuốn chiếu mãi). Cũng dùng tính % tiến độ.

### Cultivation Step (đổi/thêm)
- `offset_days` (Int, default **0**) — **đổi ngữ nghĩa**: số ngày bắt đầu sau mốc neo; 0 = ngay.
  Bỏ sentinel `-1` (auto). Migrate dữ liệu cũ: mọi bước `offset_days = -1` → `0`.
- `prerequisite` (Data, tùy chọn) — **mô tả** của một bước khác trong cùng quy trình. Trống = không có.

### Farm Task (thêm)
- `completed_on` (Date) — ngày thực sự đánh dấu hoàn thành; làm mốc neo cho bước phụ thuộc.

### Bỏ
- `Crop Cycle.setup_done_on` (xóa field).
- Hàm `setup_step_indices`, `stamp_setup_if_done`, `_setup_complete` (xóa); logic gating chuyển sang per-step prereq.

## Logic sinh việc — `generate_tasks(from_date=None, days=10)`

Với mỗi Crop Cycle `status="active"`, mỗi bước `s` của quy trình:

1. **Mốc neo (anchor):**
   - Nếu `s.prerequisite` rỗng → `anchor = start_date + s.offset_days`.
   - Nếu có `s.prerequisite`:
     - Tìm các Farm Task `{cycle: c.name, title: s.prerequisite}`. Nếu CHƯA có task nào `completed`
       → **bỏ qua bước này** (chưa tới lượt).
     - Nếu đã hoàn thành → `anchor = max(completed_on của các task đó) + s.offset_days`.
       (Phòng `completed_on` rỗng do dữ liệu cũ: fallback dùng `task_date` của task prereq.)
2. **Giới hạn cuối:** `to_limit = start_date + cycle_length_days` nếu `cycle_length_days > 0`, else `to_d`.
   Cửa sổ sinh = `[from_d, min(to_d, to_limit)]`.
3. Sinh ngày theo `due_dates(anchor, (frequency_type, frequency_value), from_d, window_end)`.
4. **Phạm vi:** per_crop giữ theo cây; shared gộp ở mức lô (`dedupe_shared`, crop="Chung").

### Khử trùng (idempotent) — TÁCH BẠCH CHU KỲ
- **per_crop**: khóa tồn tại = `(cycle, task_date, title)` → mỗi chu kỳ độc lập tuyệt đối
  (sửa lỗi cũ: khóa cũ `(block, crop, task_date, title)` thiếu cycle → chu kỳ cũ/mới cùng lô-cây bị lẫn).
- **shared**: khóa = `(block, task_date, title)` (crop="Chung") → việc chung làm 1 lần cho cả lô
  dù trồng 2 cây — giữ chủ ý ban đầu.

`generate_tasks` vẫn gọi `assign_tasks` cuối, vẫn idempotent. Hook `crop_cycle_after_insert`
(gọi `generate_tasks` khi tạo chu kỳ) **giữ nguyên** — để các bước không prereq sinh ngay lúc tạo.

## complete_task (field_api) — mở khóa bước phụ thuộc

Sau khi đánh dấu hoàn thành:
- Set `completed_on = today` cho task.
- Gọi `generate_tasks()` (idempotent) để các bước có prereq trỏ tới bước vừa xong được sinh ngay.
  (Đơn giản, không tối ưu sớm; idempotent nên an toàn.)

## API — admin_api

- `_apply_steps`: lưu `offset_days` (>=0, default 0) + `prerequisite` (chuỗi hoặc None).
- `create_process` / `update_process`: nhận + lưu `cycle_length_days`.
- `list_processes`: trả mỗi bước thêm `offsetDays`, `prerequisite`; trả process thêm `cycleLengthDays`.

## Frontend

### Ẩn Excel (tạm thời)
- `ProcessManagement.tsx`: ẩn 2 nút "Tải mẫu Excel" + "Nhập từ Excel" (xóa khỏi JSX; giữ
  `importProcessExcel`/`PROCESS_TEMPLATE_URL` trong queries để dễ bật lại). Backend sheet_import giữ nguyên.

### Form bước (StepForm)
- **Bắt đầu**: radio "Ngay" / "Sau N ngày" → khi "Sau" hiện ô số → `offsetDays` (0 khi "Ngay").
- **Bước tiên quyết**: dropdown các bước KHÁC trong quy trình (theo mô tả) + lựa chọn "Không" →
  `prerequisite` (rỗng = không). Chỉ liệt kê các bước đã có (người dùng thêm bước theo thứ tự).
- Bảng bước (desktop + mobile): cột "Bắt đầu" (Ngay / sau N ngày) + "Tiên quyết" (mô tả hoặc "—").

### Form quy trình (ProcessForm)
- Thêm ô "Số ngày 1 chu kỳ" (`cycleLengthDays`, số, để trống/0 = không giới hạn).

## Migrate / chuyển đổi
- Thêm fields qua json + `bench migrate`.
- Data fix một lần: `Cultivation Step.offset_days = -1` → `0`.
- Quy trình Gấc/Sâm import sẵn không có prereq → dưới mô hình mới sẽ dồn ngày gieo; người dùng
  nhập tay lại prereq/offset (hoặc xóa tạo mới). Chấp nhận — đúng tinh thần "nhập thủ công".
- Xóa field `setup_done_on` khỏi Crop Cycle (migrate bỏ cột).

## Phạm vi KHÔNG làm (YAGNI)
- Không "thời lượng bước" / dự báo lịch (đã chọn event-driven).
- Không data mùa vụ cho thu hoạch (coi như bước thường: offset + tần suất).
- Không nhiều prereq cho 1 bước (chỉ 1; chuỗi prereq tự nối tiếp).
- Không xóa code Excel backend (chỉ ẩn UI).

## Kiểm thử
- Thuần (`due_dates` đã có) — không đổi.
- Frappe (`test_phased_generation` viết lại thành `test_explicit_generation` hoặc cập nhật):
  - bước không prereq, offset 0 → sinh từ start_date; offset 3 → từ start_date+3.
  - bước có prereq chưa hoàn thành → KHÔNG sinh; sau khi prereq completed (set completed_on) +
    generate → bước phụ thuộc sinh từ completed_on + offset.
  - `cycle_length_days` = N → việc lặp không vượt start_date + N.
  - **Tách chu kỳ**: 2 chu kỳ (đóng cũ + active mới) cùng lô+cây → task chu kỳ mới KHÔNG bị
    khử trùng nhầm với chu kỳ cũ (khóa per_crop có cycle).
  - shared vẫn gộp 1 task/lô khi 2 cây cùng lô.
  - `complete_task` hoàn thành prereq → set completed_on + bước phụ thuộc xuất hiện ngay.
- API: create/update process lưu & trả cycle_length_days; step lưu & trả offset_days + prerequisite.
- Frontend: tsc sạch; kiểm tra tay (ẩn nút Excel; form bước có Bắt đầu + Tiên quyết; form quy trình có Số ngày chu kỳ).
