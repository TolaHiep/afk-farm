# Thiết kế: Dự báo lịch theo kế hoạch (thay event-driven gating)

Ngày: 2026-06-18
Trạng thái: Đã duyệt mô hình, chờ review spec
Thay thế: cơ chế "chờ hoàn thành thật mới sinh" của bước có tiên quyết (trong spec
`2026-06-17-quy-trinh-tuong-minh-thoi-gian-prereq-design.md`).

## Bối cảnh & vấn đề

Mô hình event-driven thuần: bước có tiên quyết **chỉ sinh sau khi** bước tiên quyết được đánh dấu
hoàn thành. Hệ quả: lịch 10 ngày **không nhìn xa được** — chỉ thấy các việc không-tiên-quyết, ngày
nào cũng như nhau; không dự báo được chuỗi thiết lập và việc chăm sóc tương lai.

Giải pháp: **dự báo lịch (forecast)** — ước lượng ngày hoàn thành từng bước để tính sẵn **ngày dự
kiến** cho mọi bước, lấp đủ cửa sổ 10 ngày. **Lịch cố định** (không tự dời khi thực tế trễ/sớm); admin
dời tay nếu cần (đã có `reschedule_task`).

## Mô hình ước lượng "số ngày hoàn thành" mỗi bước

`est_days(step)`:
- `one_time` (1 lần/chu kỳ) → `estimated_days` (field MỚI, nhập tay, mặc định 1).
- `daily` (hàng ngày) → 1.
- `n_per_period` (N lần / N ngày) → `frequency_value` (= N, số ngày chu kỳ lặp).

## Mô hình dữ liệu

### Cultivation Step (thêm)
- `estimated_days` (Int, default 1) — số ngày ước lượng hoàn thành. UI **chỉ hiện ô này khi tần suất
  = "1 lần/chu kỳ"**; các loại khác suy ra tự động (xem trên), không nhập.

## Engine

### Hàm thuần `planned_starts(steps, start_date) -> dict[description -> date]`
Tính **ngày bắt đầu dự kiến** cho mỗi bước, đệ quy theo tiên quyết, memo hoá, **an toàn với vòng lặp**
(nếu tiên quyết tạo vòng → coi như không tiên quyết):
- Không tiên quyết (hoặc tiên quyết hỏng/vòng): `start = start_date + offset_days`.
- Có tiên quyết P: `finish(P) = start(P) + est_days(P) − 1`; `start = finish(P) + 1 + offset_days`.

`steps` nhận list dict-like (description, prerequisite, frequency_type, frequency_value, offset_days,
estimated_days). Dùng `datetime.timedelta` (thuần, test được không cần Frappe).

### `generate_tasks` (đổi)
- Tính `planned = planned_starts(steps, start_date)` cho mỗi chu kỳ.
- Mỗi bước: **bỏ cơ chế chờ hoàn thành** (không còn `_prereq_anchor`, không `continue`); neo vào
  `anchor = planned[s.description]`.
- Sinh theo `due_dates(anchor, (frequency_type, frequency_value), from_d, window_end)`; với
  `n_per_period` nhân `times_per_period` task/ngày (hậu tố "(lần i/X)"). Giữ nguyên: cửa sổ dừng theo
  `cycle_length_days`, khử trùng per_crop `(cycle, date, title)` / shared `(block, date, title)`,
  `assign_tasks` cuối, hook `crop_cycle_after_insert`.

### `complete_task` (field_api) — đơn giản hoá
- Chỉ `db_set("completed_on", today)` (lưu vết). **Bỏ** gọi `generate_tasks` (không còn "mở khoá" vì
  đã dự báo sẵn).

### Bỏ
- Hàm `_prereq_anchor` (không còn dùng). `completed_on` thành bản ghi (không chặn sinh).

## Vai trò tiên quyết / offset / estimated_days
Cả ba giờ dùng để **xác định THỨ TỰ và ngày dự kiến** trong forecast — không còn chặn theo hoàn thành
thật. Tiên quyết vẫn là cách khai báo "việc này nối sau việc kia".

## API — admin_api
- `_apply_steps`: lưu `estimated_days` = `max(1, int(s.get("estimatedDays") or 1))`.
- `list_processes`: mỗi bước trả thêm `estimatedDays` = `s.estimated_days or 1`.

## Frontend — ProcessManagement
- `Step` interface: thêm `estimatedDays: number`; `emptyStep` = 1; `toApiSteps` gửi `estimatedDays`.
- `StepForm`: thêm ô **"Số ngày ước lượng hoàn thành"** (number, min 1) — **chỉ hiện khi
  `frequencyType === "one_time"`**.
- Bảng bước: (tùy chọn) hiển thị ước lượng cho bước one_time; không bắt buộc.

## Di trú
- Thêm field `estimated_days` qua json + `bench migrate` (dữ liệu cũ nhận default 1).
- Không cần đổi dữ liệu khác. (Quy trình Gấc/Sâm đã fill prereq/offset — sau khi triển khai, có thể
  nhập `estimated_days` cho các bước thiết lập nhiều ngày như "Ngâm ủ" để forecast sát hơn.)

## Phạm vi KHÔNG làm (YAGNI)
- Không tự dời lịch theo tiến độ thật (đã chọn lịch cố định).
- Không lập lịch theo giờ trong ngày.
- Không đổi cơ chế phạm vi / tần suất / cycle_length / dời tay.

## Kiểm thử
- Thuần `planned_starts`:
  - chuỗi tiên quyết 1-ngày: A(no prereq)→B→C với est=1, offset=0 → start A=ngày0, B=ngày1, C=ngày2.
  - estimated_days của one_time: A est=3 → B bắt đầu ngày 0+3 = ngày3 (finish A=ngày2, +1).
  - n_per_period làm "estimated" = frequency_value: A n_per_period/2 → B bắt đầu ngày 0+2... (finish=0+2−1=1, +1=2).
  - offset cộng thêm: B prereq A est1 offset5 → start = (0)+1+5 = 6.
  - tiên quyết hỏng/vòng → dùng start_date.
- Frappe `generate_tasks`:
  - chu kỳ với chuỗi thiết lập (one_time) + chăm sóc (prereq=gieo) → lịch 10 ngày có việc các ngày
    KHÁC nhau (chuỗi trải ra); không còn "ngày nào cũng như nhau".
  - bước có tiên quyết được sinh trong tương lai (không cần hoàn thành thật).
  - cycle_length vẫn dừng việc lặp; tách chu kỳ vẫn đúng.
- `complete_task`: set completed_on, KHÔNG sinh thêm việc.
- API/Frontend: lưu/trả estimatedDays; ô chỉ hiện khi one_time.
