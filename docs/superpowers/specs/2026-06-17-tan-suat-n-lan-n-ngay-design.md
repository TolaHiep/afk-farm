# Thiết kế: Tần suất "N lần / N ngày" (hợp nhất every_n_days + n_per_day)

Ngày: 2026-06-17
Trạng thái: Đã duyệt mô hình, chờ review spec

## Bối cảnh & vấn đề

Tần suất hiện có 4 loại: `one_time`, `daily`, `every_n_days`, `n_per_day`. Nhưng `n_per_day`
("2 lần/ngày") **chỉ sinh 1 task/ngày** — con số lần không được hiện thực hóa. `due_dates` coi
`n_per_day` như `daily` (step=1, 1 ngày 1 task), nên "2 lần/ngày" = "1 lần/ngày".

Giải pháp: giữ **Hàng ngày** + **1 lần/chu kỳ**; thay `every_n_days` và `n_per_day` bằng MỘT loại
**"N lần / N ngày"** = X lần mỗi Y ngày.

## Mô hình tần suất (chốt)

3 loại `frequency_type`:
| Loại | Ý nghĩa | Số liệu | Sinh việc |
|---|---|---|---|
| `one_time` | 1 lần/chu kỳ | — | 1 task tại mốc neo |
| `daily` | Hàng ngày | — | 1 task mỗi ngày |
| `n_per_period` | **N lần / N ngày** | X (số lần), Y (số ngày) | mỗi Y ngày sinh **X task** |

- `2 lần/ngày` = n_per_period, X=2, Y=1.
- `7 ngày/lần` = n_per_period, X=1, Y=7.
- Khi X>1: các task trong cùng ngày có hậu tố **"(lần i/X)"** (vd "Tưới mát (lần 1/2)") để tổ
  trưởng đánh dấu từng lần và tránh khử trùng. X=1 → title không hậu tố.

## Mô hình dữ liệu

### Cultivation Step (đổi/thêm)
- `frequency_type` Select: đổi options thành `one_time\ndaily\nn_per_period` (bỏ every_n_days, n_per_day).
- `frequency_value` (Int) — **ngữ nghĩa = Y (số ngày 1 chu kỳ lặp)** cho `n_per_period`; daily/one_time bỏ qua. Mặc định 1.
- `times_per_period` (Int, default 1) — **MỚI** = X (số lần mỗi Y ngày). daily/one_time = 1.

### Di trú dữ liệu cũ (data fix, một lần)
- `every_n_days` (value=N) → `n_per_period`, frequency_value=N, times_per_period=1.
- `n_per_day` (value=N) → `n_per_period`, frequency_value=1, times_per_period=N.
- `daily` / `one_time`: giữ nguyên (times_per_period=1 mặc định).

## Engine

### `due_dates(start, freq, from_date, to_date)` (đổi)
`freq = (frequency_type, period)` — `period` = Y (frequency_value).
- `one_time`: trả `[start]` nếu trong cửa sổ.
- `daily`: step = 1.
- `n_per_period`: step = max(1, Y).
(Bỏ nhánh `every_n_days`/`n_per_day`.) Trả danh sách NGÀY (mỗi occurrence 1 ngày) — phần "X lần"
xử lý ở generate_tasks.

### `generate_tasks` (đổi phần tạo rows)
Mỗi bước: `times = int(s.times_per_period or 1)` (nhưng daily/one_time ép times=1).
Với mỗi ngày `d` từ `due_dates`:
- nếu `times <= 1`: 1 row, title = description.
- nếu `times > 1`: `times` row, title = `f"{description} (lần {i+1}/{times})"` (i=0..times-1).
Mandays mỗi task = `compute_mandays(...)` (tổng công ngày đó = X × per-task — đúng: làm X lần = X công).
Khử trùng giữ nguyên: per_crop (cycle, date, title); shared (block, date, title) — title đã phân biệt theo "(lần i/X)".

### `parse_frequency(text)` (Excel, dormant — vẫn cập nhật cho nhất quán)
Trả **3-tuple `(frequency_type, value, times)`**:
- "1 lần/chu kỳ" → (one_time, 1, 1)
- "Hàng ngày" → (daily, 1, 1)
- "N lần/ngày" → (n_per_period, 1, N)
- "N ngày/lần" / "N năm/lần" / "N lần/M năm" → (n_per_period, <số ngày>, 1)
`import_rows` cập nhật để set `times_per_period` từ phần thứ 3.

## API — admin_api

- `_apply_steps`: lưu `frequency_value` (Y) + `times_per_period` (X, từ `timesPerPeriod`, default 1).
- `list_processes`: mỗi bước trả thêm `timesPerPeriod`; `_freq_text` đổi để hiển thị:
  - one_time → "1 lần/chu kỳ"; daily → "Hàng ngày"; n_per_period → "X lần / Y ngày".

## Frontend — ProcessManagement

- `FREQ_OPTIONS`: `{one_time: "1 lần/chu kỳ"}`, `{daily: "Hàng ngày"}`, `{n_per_period: "N lần / N ngày"}`.
- `Step` interface: thêm `timesPerPeriod: number`; `frequencyValue` = Y.
- `StepForm`: khi chọn `n_per_period` → hiện 2 ô số: **"Số lần (X)"** (timesPerPeriod) và **"Mỗi (Y) ngày"** (frequencyValue). daily/one_time → ẩn 2 ô.
- `toApiSteps`: gửi `frequencyType`, `frequencyValue`, `timesPerPeriod`.
- `emptyStep`: frequencyType "daily", frequencyValue 1, timesPerPeriod 1.
- Bảng: cột Tần suất hiển thị theo `_freq_text` từ API ("X lần / Y ngày").

## Di trú / chuyển đổi
- Thêm field `times_per_period` qua json + `bench migrate`.
- Đổi options `frequency_type` (bỏ every_n_days/n_per_day) qua json + migrate.
- Data fix: convert every_n_days/n_per_day → n_per_period như trên (script một lần).

## Phạm vi KHÔNG làm (YAGNI)
- Không lập lịch theo GIỜ trong ngày (chỉ đếm số lần/ngày, không gán giờ cụ thể).
- Không đổi cơ chế prereq/offset/cycle_length (giữ nguyên).

## Kiểm thử
- `due_dates`: n_per_period step theo Y; daily step 1; one_time once. (cập nhật test cũ every_n_days→n_per_period.)
- `generate_tasks`: n_per_period X=2,Y=1 → 2 task/ngày với hậu tố "(lần 1/2)","(lần 2/2)"; X=1,Y=7 → 1 task mỗi 7 ngày; daily → 1/ngày; one_time → 1 lần.
- Idempotent: chạy lại không tạo trùng các task "(lần i/X)".
- API: create/list trả timesPerPeriod; _freq_text hiển thị "X lần / Y ngày".
- parse_frequency 3-tuple đúng cho các chuỗi.
- Frontend: tsc sạch; StepForm hiện 2 ô khi n_per_period; bảng hiển thị đúng.
