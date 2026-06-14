# Kế hoạch triển khai Giai đoạn 1 (MVP) — Phần mềm AKF

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans để thực thi từng task. Các bước dùng checkbox `- [ ]`.

**Goal:** Xây dựng MVP quản lý sản xuất nông trại AKF: admin thiết lập vùng/lô và quy trình canh tác, hệ thống tự sinh việc 10 ngày và gán tổ trưởng, tổ trưởng báo cáo trên điện thoại, theo dõi bằng bản đồ nhiệt — không xung đột khi 1 lô trồng 2 cây.

**Architecture:** ERPNext v15 + Frappe Framework, toàn bộ tùy biến nằm trong custom app `akf_farm`. Giao diện văn phòng dùng Frappe Desk; tổ trưởng dùng PWA tự viết tại `/akf`; bản đồ ranh giới/nhiệt dùng Leaflet; engine sinh việc là scheduled job Python.

**Tech Stack:** Python 3.11, Frappe/ERPNext v15, MariaDB, Redis, Leaflet.js, IndexedDB (offline), docker compose (frappe_docker).

---

## Cấu trúc file chính

```
akf_farm/
├── akf_farm/
│   ├── doctype/
│   │   ├── farm_zone/                 # Vùng: ranh giới GeoJSON, diện tích
│   │   ├── farm_block/                # Lô: thuộc zone, ranh giới, diện tích, tổ trưởng
│   │   ├── work_team/                 # Tổ + child table thành viên
│   │   ├── cultivation_process/       # Quy trình canh tác (gấc/sâm)
│   │   ├── cultivation_step/          # Child: mô tả, công/ha, tần suất, phạm vi
│   │   ├── crop_cycle/                # Chu kỳ cây trên block (start date, crop)
│   │   ├── farm_task/                 # Công việc: block+crop+ngày+tổ trưởng+trạng thái
│   │   ├── daily_production/          # Số liệu sản xuất cuối ngày
│   │   └── abnormal_report/           # Báo cáo bất thường + ảnh
│   ├── engine/
│   │   ├── task_generator.py          # Sinh việc theo tần suất + khử trùng lặp
│   │   ├── workload_balancer.py       # Cân đối gán tổ trưởng
│   │   └── status_calculator.py       # Tính màu bản đồ nhiệt + cảnh báo
│   ├── api/
│   │   ├── field_api.py               # REST cho PWA tổ trưởng
│   │   └── sheet_import.py            # Nhập quy trình từ file sheet
│   ├── www/akf/                       # PWA tổ trưởng (html/js/sw.js)
│   ├── page/farm_calendar/            # Lịch 10 ngày
│   ├── page/farm_heatmap/             # Bản đồ nhiệt
│   └── tests/
docker/                               # docker-compose, Dockerfile akf_farm
```

---

## Gói 1 — Môi trường & khung dự án  (ước tính: 2 công)

### Task 1.1: Dựng frappe_docker + tạo app akf_farm
- [ ] Clone frappe_docker, cấu hình compose cho dev (MariaDB, Redis, site `akf.localhost`)
- [ ] `bench new-app akf_farm`, cài vào site, bật chế độ developer
- [ ] Cấu hình `pytest`/`bench run-tests --app akf_farm`, viết 1 test smoke pass
- [ ] Commit: `chore: scaffold akf_farm app + docker dev env`

---

## Gói 2 — Vùng trồng (Zone/Block)  (ước tính: 3 công)

### Task 2.1: DocType Farm Zone
**Files:** Create `akf_farm/doctype/farm_zone/`
- [ ] Test: tạo zone với tên, diện tích (ha), boundary (JSON GeoJSON) → lưu và đọc lại đúng
- [ ] Định nghĩa DocType: `zone_name`, `area_ha` (Float), `boundary` (Code/JSON), `note`
- [ ] Validate: diện tích > 0; boundary là GeoJSON hợp lệ
- [ ] Test pass; commit

### Task 2.2: DocType Farm Block
**Files:** Create `akf_farm/doctype/farm_block/`
- [ ] Test: tạo block thuộc zone, có diện tích, ranh giới, gán `team_leader` (Link User)
- [ ] Trường: `block_name`, `zone` (Link), `area_ha`, `boundary`, `team_leader`, `status`
- [ ] Validate: tổng diện tích block ≤ diện tích zone (cảnh báo, không chặn cứng)
- [ ] Test pass; commit

---

## Gói 3 — Quy trình canh tác + nhập sheet  (ước tính: 4 công)

### Task 3.1: DocType Cultivation Process + Cultivation Step
- [ ] Test: tạo quy trình "Sâm" với 23 step; mỗi step có `description`, `mandays_per_ha`, `frequency_type` (one_time/every_n_days/daily/n_per_day), `frequency_value`, `scope` (per_crop/shared)
- [ ] Định nghĩa 2 DocType (process + child step); enum frequency và scope
- [ ] Test pass; commit

### Task 3.2: Parser tần suất
**Files:** Create `akf_farm/engine/frequency.py`
- [ ] Test: "1095 ngày/lần" → (every_n_days, 1095); "Hàng ngày" → (daily,1); "2 lần/ngày" → (n_per_day,2); "7 ngày/lần" → (every_n_days,7); "1 lần/20 năm" → (every_n_days, 7300)
- [ ] Viết hàm `parse_frequency(text)`; test pass; commit

### Task 3.3: Nhập quy trình từ file sheet
**Files:** Create `akf_farm/api/sheet_import.py`
- [ ] Test: đọc file mẫu (cột Bước, Mô tả, Công/ha, Tần suất, Phạm vi) → tạo process + steps đúng
- [ ] Dùng `openpyxl`/`frappe`; xử lý lỗi định dạng, báo dòng lỗi
- [ ] Test pass; commit. Kèm file mẫu `docs/mau-quy-trinh.xlsx`

---

## Gói 4 — Chu kỳ cây trồng  (ước tính: 2 công)

### Task 4.1: DocType Crop Cycle
- [ ] Test: 1 block có thể có 2 cycle active (gấc + sâm) với `start_date` khác nhau; chặn 2 cycle cùng loại cây active
- [ ] Trường: `block` (Link), `crop` (Gac/Sam), `process` (Link), `start_date`, `status` (active/closed)
- [ ] Validate trùng loại cây; test pass; commit

---

## Gói 5 — Engine sinh việc (lõi khó nhất)  (ước tính: 6 công)

### Task 5.1: Tính việc đến hạn theo tần suất
**Files:** Create `akf_farm/engine/task_generator.py`
- [ ] Test: cycle bắt đầu 01/01, step "20 ngày/lần" → việc rơi vào 01/01, 21/01, 10/02...; daily → mỗi ngày; one_time → đúng ngày start
- [ ] Hàm `due_dates(cycle, step, from_date, to_date)`; test pass; commit

### Task 5.2: Quy đổi công theo diện tích
- [ ] Test: step 3 công/ha trên block 2ha → 6 công; step shared (no manday) → 0
- [ ] Hàm `compute_mandays(step, block)`; test pass; commit

### Task 5.3: Khử trùng lặp việc dùng chung
- [ ] Test: block trồng cả gấc+sâm, ngày X có "Kiểm tra hệ thống tưới" (shared) ở cả 2 process → chỉ tạo 1 farm_task; việc per_crop → tạo riêng từng cây
- [ ] Logic dedup theo (block, ngày, description, scope=shared); test pass; commit

### Task 5.4: Sinh việc 10 ngày (scheduled job)
- [ ] Test: chạy generator cho horizon 10 ngày tạo đúng tập farm_task, idempotent (chạy lại không tạo trùng)
- [ ] Đăng ký `scheduler_events` (hằng đêm); test pass; commit

---

## Gói 6 — Tự gán tổ trưởng + admin chỉnh tay  (ước tính: 3 công)

### Task 6.1: Cân đối tải
**Files:** Create `akf_farm/engine/workload_balancer.py`
- [ ] Test: nhiều việc trong ngày chia cho các tổ trưởng sao cho tổng công lệch nhau tối thiểu; ưu tiên tổ trưởng phụ trách block
- [ ] Hàm `assign_leaders(tasks_of_day)`; test pass; commit

### Task 6.2: Admin gán lại
- [ ] Test: API đổi `team_leader` của 1 farm_task; ghi log thay đổi
- [ ] Endpoint + quyền admin; test pass; commit

---

## Gói 7 — Lịch 10 ngày  (ước tính: 3 công)

### Task 7.1: Trang lịch
**Files:** Create `akf_farm/page/farm_calendar/`
- [ ] Hiển thị việc 10 ngày tới dạng lịch, lọc theo zone/block/tổ trưởng/cây
- [ ] Bấm việc xem chi tiết; kéo/đổi ngày (lùi lịch) gọi API
- [ ] Kiểm thử thủ công; commit

---

## Gói 8 — Bản đồ ranh giới + bản đồ nhiệt  (ước tính: 5 công)

### Task 8.1: Vẽ ranh giới khi tạo zone/block
**Files:** Create `akf_farm/public/js/boundary_map.js` (Leaflet)
- [ ] Vẽ/sửa polygon → lưu GeoJSON vào `boundary`; tính diện tích gợi ý
- [ ] Kiểm thử thủ công; commit

### Task 8.2: Status calculator
**Files:** Create `akf_farm/engine/status_calculator.py`
- [ ] Test: block không quá hạn & không bất thường → xanh; đến hạn chưa xong → vàng; quá hạn/bất thường chưa xử lý → đỏ; block 2 cây lấy mức xấu nhất
- [ ] Hàm `block_status(block, date)`; test pass; commit

### Task 8.3: Trang bản đồ nhiệt
**Files:** Create `akf_farm/page/farm_heatmap/`
- [ ] Tô màu vùng theo status; bấm vùng xem chi tiết; kiểm thử thủ công; commit

---

## Gói 9 — CRUD việc thủ công + lùi lịch  (ước tính: 2 công)

### Task 9.1: Tạo/sửa/xóa việc tay + lùi lịch
- [ ] Test: admin tạo farm_task thủ công; đổi `task_date` (lùi lịch) không ảnh hưởng cây khác cùng block; xóa việc
- [ ] Quyền + validate; test pass; commit

---

## Gói 10 — PWA tổ trưởng (lõi khó)  (ước tính: 7 công)

### Task 10.1: REST API hiện trường
**Files:** Create `akf_farm/api/field_api.py`
- [ ] Test: GET việc theo tổ trưởng/ngày; POST đánh dấu hoàn thành; POST số liệu; POST báo cáo bất thường (bắt buộc ảnh)
- [ ] Test pass; commit

### Task 10.2: Giao diện PWA 5–7 nút
**Files:** Create `akf_farm/www/akf/` (index, app.js, style)
- [ ] Màn hình: Việc hôm nay → Chi tiết (Bắt đầu/Hoàn thành) → Báo cáo cuối ngày (số liệu + bất thường + ảnh) 
- [ ] Nén ảnh client, gắn timestamp + GPS; chặn gửi nếu thiếu ảnh
- [ ] Kiểm thử thủ công; commit

### Task 10.3: Offline + đồng bộ
**Files:** Create `akf_farm/www/akf/sw.js` + IndexedDB queue
- [ ] Lưu nháp khi mất mạng, tự gửi khi có mạng, chống gửi trùng; hiển thị trạng thái đồng bộ
- [ ] Kiểm thử thủ công (tắt mạng); commit

---

## Gói 11b — KPI hiệu suất tổ trưởng  (ước tính: 3 công)

### Task 11b.1: Tính KPI theo tổ trưởng
**Files:** Create `akf_farm/engine/leader_kpi.py`
- [ ] Test: với tập farm_task + daily_production + abnormal_report của một tổ trưởng trong kỳ → tính đúng: tỷ lệ đúng hạn (%), số việc quá hạn, tổng việc hoàn thành, tỷ lệ ngày báo cáo đầy đủ (%), số báo cáo bất thường, tổng công đảm nhận
- [ ] Hàm `leader_kpi(team_leader, from_date, to_date)`; test pass; commit

### Task 11b.2: Dashboard/báo cáo KPI tổ trưởng
- [ ] Hiển thị KPI dạng bảng + biểu đồ, lọc theo tổ trưởng/vùng/kỳ (ngày/tuần/tháng); xuất được
- [ ] Kiểm thử thủ công; commit

## Gói 11 — Cảnh báo + dashboard  (ước tính: 3 công)

### Task 11.1: Phát cảnh báo
- [ ] Test: job cuối ngày tạo Notification cho admin khi có việc quá hạn / báo cáo bất thường chưa xử lý; KHÔNG tự đổi lịch ngày sau
- [ ] Test pass; commit

### Task 11.2: Dashboard cơ bản
- [ ] % hoàn thành hôm nay, số việc quá hạn, số vùng đỏ/vàng, danh sách bất thường mới; kiểm thử; commit

---

## Gói 12 — Phân quyền 2 vai trò + audit  (ước tính: 2 công)

### Task 12.1: Role + giới hạn dữ liệu
- [ ] Role "AKF Admin" (toàn quyền), "AKF Team Leader" (chỉ việc của mình)
- [ ] Test: tổ trưởng A không đọc được việc tổ B; audit dùng Version log
- [ ] Test pass; commit

---

## Gói 13 — Dữ liệu mẫu + kiểm thử tổng thể + tài liệu  (ước tính: 3 công)

### Task 13.1: Seed dữ liệu mẫu
- [ ] `bench execute` nạp: 2 zone, 6 block, 2 tổ trưởng, 10 tổ viên, quy trình gấc+sâm, vài cycle
- [ ] Commit

### Task 13.2: Kịch bản nghiệm thu end-to-end + tài liệu HDSD tiếng Việt
- [ ] Chạy trọn vòng theo tiêu chí nghiệm thu (sinh việc → giao → báo cáo → bản đồ nhiệt → cảnh báo → lùi lịch)
- [ ] Tài liệu hướng dẫn admin + tổ trưởng; commit

---

## Tổng hợp ước tính công (1 dev)

| Gói | Nội dung | Công |
|---|---|---|
| 1 | Môi trường & khung dự án | 2 |
| 2 | Vùng/Lô + ranh giới | 3 |
| 3 | Quy trình canh tác + nhập sheet | 4 |
| 4 | Chu kỳ cây trồng | 2 |
| 5 | Engine sinh việc (khử trùng lặp, quy đổi công) | 6 |
| 6 | Tự gán tổ trưởng + chỉnh tay | 3 |
| 7 | Lịch 10 ngày | 3 |
| 8 | Bản đồ ranh giới + bản đồ nhiệt | 5 |
| 9 | CRUD việc thủ công + lùi lịch | 2 |
| 10 | PWA tổ trưởng (offline, ảnh, báo cáo) | 7 |
| 11 | Cảnh báo + dashboard | 3 |
| 11b | KPI hiệu suất tổ trưởng | 3 |
| 12 | Phân quyền + audit | 2 |
| 13 | Dữ liệu mẫu + kiểm thử + tài liệu | 3 |
| | **Tổng phát triển** | **48** |
| | Quản lý dự án, nghiệm thu & bàn giao | 2 |
| | **Tổng cộng** | **50** |

Dự phòng đề xuất 15% (~7 công) cho thay đổi yêu cầu và vòng phản hồi pilot.

## Self-review
- Spec coverage: zone/block ranh giới (G2,8), quy trình + sheet (G3), 2 cây song song (G4), tự sinh + khử trùng lặp + quy đổi công (G5), tự gán + chỉnh tay (G6), lịch 10 ngày (G7), bản đồ nhiệt (G8), CRUD + lùi lịch (G9), PWA + ảnh + offline (G10), cảnh báo không tự đổi lịch (G11), 2 vai trò (G12) — đủ.
- Không placeholder ở mức gói/task; chi tiết micro-step sẽ mở rộng khi thực thi từng task.
