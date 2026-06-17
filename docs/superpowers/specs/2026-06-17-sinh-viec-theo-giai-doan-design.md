# Thiết kế: Sinh việc theo giai đoạn + offset từng bước

Ngày: 2026-06-17
Trạng thái: Đã duyệt thiết kế, chờ review spec

## Bối cảnh & vấn đề

`task_generator.generate_tasks` hiện neo **mọi bước** vào `start_date` của Crop Cycle, nên
ngày gieo bị dồn cả 22 việc — kể cả việc bảo trì (tưới nước, tỉa cành, họp, kiểm tra) lẽ ra chỉ
bắt đầu **sau khi** nhóm việc gieo trồng (setup) hoàn thành. "Gieo chưa xong thì chưa có tưới nước."

Giải pháp **kết hợp**:
- Mỗi bước có thể khai báo **offset** (số ngày sau ngày gieo) — tùy chọn. Có offset thì sinh theo
  offset (đè lên mọi logic khác).
- Không có offset thì **xử lý tự động theo giai đoạn**: việc setup neo vào ngày gieo; việc bảo trì
  chỉ sinh sau khi toàn bộ việc setup đã hoàn thành, neo vào ngày setup xong.
- Admin vẫn **dời từng task thủ công** qua Lịch công việc (đã có `reschedule_task`) để tinh chỉnh.

## Mô hình dữ liệu (hiện có, tham chiếu)

- `Cultivation Step` (child): step, description, mandays_per_ha, frequency_type
  (one_time/daily/every_n_days/n_per_day), frequency_value, scope (per_crop/shared), require_photo.
- `Crop Cycle`: block, crop, cultivation_process, start_date, status (active/closed).
- `Farm Task`: block, crop, cycle (Link), title, task_date, status (pending/in-progress/completed/overdue), ...
- `engine/task_generator.py::due_dates(start, freq, from_date, to_date)` — đã có, neo theo `start`.
- `engine/task_generator.py::generate_tasks(from_date=None, days=10)` — job cuốn chiếu, idempotent,
  chạy daily + qua hook `crop_cycle_after_insert`.
- `field_api.complete_task(task, ...)` — tổ trưởng đánh dấu hoàn thành.

## Trường mới

- **`Cultivation Step.offset_days`** (Int, **default `-1`**). Quy ước:
  - `-1` = **tự động** (theo giai đoạn) — đây là mặc định, và là giá trị các bước cũ nhận sau migrate
    (vì default -1 → mọi bước hiện có vẫn chạy logic giai đoạn, không bị dồn ngày 1).
  - `0` = đúng **ngày gieo**.
  - `> 0` = số ngày sau ngày gieo.
  Nhãn "Bắt đầu sau khi gieo (ngày)". Backend chuẩn hoá: ô trống / None ở UI/Excel → `-1`.
- **`Crop Cycle.setup_done_on`** (Date, không bắt buộc) — ngày nhóm việc setup hoàn tất.

## Xác định "khối setup"

Setup = **khối bước `one_time` liên tiếp ở ĐẦU danh sách bước** (sắp theo `step`/thứ tự trong child
table). Dừng tại bước đầu tiên KHÔNG phải one_time. Bước có `offset_days >= 0` được loại khỏi logic
này (nó tự sinh theo offset). Nếu quy trình không có bước one_time đầu → khối setup rỗng.

Hàm thuần: `setup_step_indices(steps) -> set[int]` (trả tập index bước thuộc khối setup; bỏ qua
bước có `offset_days >= 0`). Test được không cần Frappe.

## Mốc bắt đầu mỗi bước (thứ tự ưu tiên) — trong `generate_tasks`

Với mỗi bước `s` của một chu kỳ active:
1. **`s.offset_days >= 0`** → anchor = `start_date + offset_days`. Sinh theo
   `due_dates(anchor, freq, window)`. KHÔNG phụ thuộc setup.
2. **`offset_days < 0` (auto) + `s` thuộc khối setup** → anchor = `start_date`.
3. **`offset_days < 0` (auto) + `s` là bảo trì** → nếu `setup_done_on` rỗng: **bỏ qua** (chưa sinh).
   Nếu có: anchor = `setup_done_on`.

## Đánh dấu setup hoàn tất (`setup_done_on`)

- "Việc setup của chu kỳ" = các Farm Task sinh ra từ các bước thuộc khối setup (nhận biết qua
  `cycle` + `title` = description của bước setup).
- **Trong `generate_tasks`**: với mỗi cycle active có `setup_done_on` rỗng, nếu khối setup không rỗng
  và **mọi** việc setup của cycle đã `completed` → set `setup_done_on = today` trước khi sinh bảo trì.
  Nếu khối setup rỗng → coi như setup xong ngay (`setup_done_on = start_date`) để bảo trì chạy từ ngày gieo.
- **Trong `complete_task`** (field_api): sau khi đánh dấu 1 task xong, nếu task đó thuộc cycle có
  `setup_done_on` rỗng và mọi việc setup của cycle đã xong → set `setup_done_on = today` rồi gọi
  `generate_tasks()` để việc bảo trì xuất hiện ngay.

## Backend — thay đổi

- `Cultivation Step` json: thêm field `offset_days` (Int). `Crop Cycle` json: thêm `setup_done_on` (Date).
  → cần `bench migrate`.
- `task_generator.py`:
  - Thêm `setup_step_indices(steps)` (thuần).
  - Sửa `generate_tasks`: áp logic anchor 3 mức ở trên; set `setup_done_on` khi đủ điều kiện.
  - Thêm helper `_setup_complete(cycle_name, setup_descriptions) -> bool` (Frappe) dùng chung.
- `field_api.complete_task`: sau khi save, kiểm tra & set `setup_done_on` + `generate_tasks()` nếu setup vừa xong.
- `api/admin_api.py`:
  - `_apply_steps` (dùng cho create/update process) đọc thêm `offsetDays` → `offset_days`.
  - `list_processes` / serializer trả `offset_days` cho mỗi bước.
- `api/sheet_import.py`: mẫu Excel + `parse_workbook`/`import_rows` thêm cột **"Bắt đầu sau (ngày)"**
  (tùy chọn) → `offset_days` (rỗng = None).

## Frontend — thay đổi

- `ProcessManagement.tsx`:
  - `Step` interface + `toApiSteps` thêm `offsetDays?: number | null`.
  - StepForm: thêm ô số "Bắt đầu sau khi gieo (ngày)" (tùy chọn, để trống = tự động).
  - Bảng bước: hiện cột "Bắt đầu sau" (số ngày hoặc "—/tự động").
- Không đổi WorkCalendar — dời task thủ công đã có.

## Luồng (Gấc minh hoạa)

- Bước 1–6 one_time, không offset → setup, sinh ngày gieo (Ngày 1). Chỉ 6 việc ngày 1.
- Bước 7–22 bảo trì, không offset → chỉ sinh sau khi 6 việc setup completed, neo từ `setup_done_on`.
- Bước one_time muộn (Tỉa cây đực, Ghép cây) nếu admin đặt `offset_days` (vd 30, 45) → sinh đúng
  Ngày 31, 46 thay vì dồn lúc setup xong.

## Phạm vi KHÔNG làm (YAGNI)
- Không sinh bảo trì dựa trên ngày hoàn thành thực của TỪNG việc setup riêng lẻ (chỉ cần "tất cả xong").
- Không thay đổi cơ chế dời task thủ công (đã có).
- Không tự suy offset cho one_time muộn — admin tự đặt nếu cần chính xác.

## Kiểm thử
- Thuần: `setup_step_indices` (khối one_time đầu; dừng ở bước định kỳ; bỏ bước có offset; rỗng khi không có one_time đầu).
- `due_dates` đã có test — không đổi.
- Frappe (`test_task_generator` mở rộng / `test_events`):
  - offset có → việc neo start_date+offset.
  - bảo trì không offset + setup chưa xong → 0 việc bảo trì; setup xong (mọi task setup completed) →
    `setup_done_on` set + bảo trì sinh từ ngày đó.
  - khối setup rỗng → bảo trì sinh từ ngày gieo.
  - `complete_task` hoàn thành việc setup cuối → `setup_done_on` set + việc bảo trì xuất hiện ngay.
- API: create/update process lưu & trả `offset_days`; import Excel đọc cột "Bắt đầu sau (ngày)".
