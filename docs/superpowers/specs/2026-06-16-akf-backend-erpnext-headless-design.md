# SPEC — BACKEND GIAI ĐOẠN 1 (ERPNext headless + custom app `akf_farm`)

- Ngày: 16/06/2026
- Bổ sung/chi tiết hóa phần backend cho GĐ1. Thay thế giả định kiến trúc "Frappe Desk + PWA tự viết" trong plan `2026-06-14` (vì frontend React đã hoàn tất, đóng vai trò giao diện duy nhất).
- Liên quan: `docs/superpowers/specs/2026-06-14-akf-gd1-overview-design.md` (nghiệp vụ GĐ1), `docs/TECH-STACK.md`, `docs/superpowers/plans/2026-06-14-akf-gd1-implementation.md` (plan sẽ được điều chỉnh theo spec này).

## Bối cảnh & 4 quyết định đã chốt

Frontend đã xong (`web/`: Vite + React 18 + TS + shadcn/ui), hiện 23 file `import mockData` đọc dữ liệu đồng bộ, chưa có lớp API/auth/store. Bốn quyết định chốt với chủ dự án:

1. **Nền tảng backend = ERPNext/Frappe v15 headless + custom app `akf_farm`.** Lý do giữ ERPNext: GĐ2/GĐ3 chắc chắn dùng nhiều module nghiệp vụ (kế toán / kho / mua hàng / truy xuất nguồn gốc) — tận dụng cả UI lẫn logic sẵn có của ERPNext thay vì xây lại.
2. **React SPA là giao diện nghiệp vụ duy nhất.** Không dùng Frappe Desk cho người dùng AKF (admin + tổ trưởng). Desk chỉ để admin kỹ thuật cấu hình hệ thống.
3. **Lớp API = custom whitelisted endpoints khớp sẵn shape frontend.** Không bắt frontend tự ghép `/api/resource/<DocType>`. Endpoint trả JSON đúng cấu trúc dữ liệu frontend đang dùng → sửa frontend tối thiểu, hai bên tách bạch.
4. **Tái dùng Frappe Desk chỉ cho GĐ2/3 (ERP modules), KHÔNG cho GĐ1.** Lịch 10 ngày và bản đồ nhiệt vệ tinh đã có sẵn trong React (đặt riêng, tốt hơn view generic của Desk); bản đồ nhiệt + trộn màu tỷ lệ Frappe không có sẵn nên đằng nào cũng tự viết Leaflet.

## 1. Kiến trúc tổng thể

- Toàn bộ tùy biến nằm trong custom app `akf_farm` (DocTypes, engines, API, roles, seed).
- **Triển khai same-origin:** nginx phục vụ React tĩnh ở `/`, reverse-proxy `/api` `/files` `/assets` về Frappe → dùng chung **cookie session**, tránh CORS. Dev: Vite `server.proxy` chuyển `/api` sang site Frappe (`akf.localhost`).
- Gộp `frappe_docker` (mariadb, redis, frappe web, scheduler/worker, nginx) vào `docker-compose.yml` để chạy chung một lệnh với service `web` hiện có.

## 2. Mô hình dữ liệu (DocTypes) — ánh xạ từ `mockData.ts`

| DocType | Trường chính |
|---|---|
| Farm Zone | `zone_name`, `area` (m²), `boundary` (GeoJSON/Code), `status`, `note` |
| Farm Block (Lô) | `block_name`, `zone` (Link), `area` (m²), `boundary`, `team_leader` (Link User), `status` |
| Cultivation Process | `process_name`, `crop`, child `steps` |
| Cultivation Step (child) | `step`, `description`, `mandays_per_ha`, `frequency_type` (one_time/daily/every_n_days/n_per_day), `frequency_value`, `scope` (per_crop/shared), `require_photo` |
| Crop Cycle | `block` (Link), `crop` (Gấc/Sâm), `process` (Link), `start_date`, `status` (active/closed) |
| Farm Task | `block`, `crop`, `cycle`, `title`, `task_date`, `team_leader`, `status` (pending/in-progress/completed/overdue), `require_photo`, `priority` |
| Daily Production | `block`, `crop`, `date`, số liệu sản xuất cuối ngày |
| Abnormal Report | `type`, `block`, `crop`, `reporter`, `date`, `description`, `photos`, `status` (pending/in-progress/resolved), `reply` |
| Support Request | `team_leader`, `block`, `type`, `content`, `photos`, `sent_at`, `status`, `reply` |
| Team Leader Report | `team_leader`, `block`, `crop`, `date`, `content`, `photos`, `abnormal`, `status`, `reply` |
| Team Member | `member_name`, `phone`, `team_leader` (Link) — **chỉ dữ liệu, không tài khoản** |
| App Settings / Email Settings | Single DocType |

**User & Role:** `AKF Admin` (toàn quyền) + `AKF Team Leader` (chỉ dữ liệu của mình). Tổ trưởng = Frappe User; admin đăng nhập bằng email, tổ trưởng đăng nhập bằng **số điện thoại** (đặt làm username). Tổ viên không có tài khoản.

## 3. Engines (Python thuần — phần lõi)

- `engine/frequency.py` — `parse_frequency(text)`: "7 ngày/lần"→(every_n_days,7), "Hàng ngày"→(daily,1), "2 lần/ngày"→(n_per_day,2), "1 lần/chu kỳ"→one_time...
- `engine/task_generator.py` — `due_dates(cycle, step, from, to)`; `compute_mandays(step, block)` (công/ha × diện tích ha); **khử trùng lặp việc `scope=shared`** theo (block, ngày, description); job sinh việc **10 ngày**, **idempotent** (chạy lại không tạo trùng).
- `engine/workload_balancer.py` — `assign_leaders(tasks_of_day)`: chia việc để tổng công lệch tối thiểu, ưu tiên tổ trưởng phụ trách block; admin chỉnh tay được, có log.
- `engine/status_calculator.py` — tính **trạng thái theo từng cây** (good/warning/danger/done/pending/inactive) từ task + bất thường: quá hạn→danger, đến hạn chưa xong→warning, xong hết→good/done, bất thường chưa xử lý nâng mức; trả kèm `done`/`total` mỗi cây; và `status` gộp = **worst-of** (danger>warning>pending>good/done>inactive) cho badge.
- `engine/leader_kpi.py` — `leader_kpi(team_leader, from, to)`: % đúng hạn, số quá hạn, tổng hoàn thành, % ngày báo cáo đầy đủ, số bất thường, tổng công; tách theo cây.

### Bản đồ nhiệt — phân định rõ backend vs frontend

**Việc trộn màu nằm ở FRONTEND, backend KHÔNG trộn màu.** Logic FE đã xác nhận (`web/src/components/admin/HeatMap.tsx`):

- Màu tô ô lô = **trộn RGB theo tỷ lệ**, trọng số = **`total` (số việc) của từng cây** (không phải số cây). Lọc 1 cây thì dùng màu trạng thái cây đó. Pane `blur(18px)` tạo gradient là render thuần FE.
- Trạng thái gộp **worst-of** chỉ dùng cho badge chữ + chấm tròn, **không** dùng tô màu ô.

→ Contract heatmap = đúng shape `plot.crops[]` hiện có (mỗi cây: `crop`, `status`, `done`, `total`) + `status` gộp. FE giữ nguyên phần màu. Backend có **test riêng** đảm bảo trọng số trộn dùng `total`.

## 4. Lớp API (custom `@frappe.whitelist`, trả JSON đúng shape frontend)

- **auth:** `login` / `logout` / `me`.
- **admin:** zones, plots, teams (tổ trưởng + tổ viên), processes (+ `sheet_import`), crop-cycles, tasks (lịch 10 ngày, CRUD, lùi lịch, gán lại), heatmap (zones/plots + crops[]), kpi, reports, support, notifications, settings, dashboard stats.
- **field (mobile):** việc hôm nay / sắp tới, chi tiết, đánh dấu hoàn thành, báo cáo cuối ngày (**bắt buộc ảnh**), bất thường, hỗ trợ, thông báo, tài khoản.
- **upload ảnh** qua Frappe File API.

Mỗi endpoint trả JSON khớp cấu trúc `mockData.ts` (giữ tên trường như `plotId`, `teamLeaderId`, `crops[]`...) để FE chỉ thay nguồn đọc, không sửa component.

## 5. Auth & phân quyền (cả hai phía)

- **Backend:** session cookie login (`usr`/`pwd`). Permission query giới hạn tổ trưởng chỉ thấy task/lô của mình; kiểm tra lại quyền trong từng API.
- **Frontend:** thêm `AuthContext` + **route guard** (chặn `/admin`, `/mobile` khi chưa đăng nhập) + wrapper `fetch` gắn `credentials: 'include'`, tự redirect khi 401. Nối 2 form login hiện có (AdminLogin email, MobileLogin số điện thoại) vào API thật.

## 6. Offline & đồng bộ

- Hàng đợi IndexedDB ở frontend; backend **idempotent** — client gửi `client_uuid` để chống gửi trùng khi đồng bộ lại. Ảnh nén ở client, kèm timestamp + GPS.

## 7. Tích hợp frontend (bắt buộc để backend dùng được)

- Thêm `web/src/lib/api.ts` (fetch wrapper) + hooks theo từng domain, thay 23 chỗ `import mockData` bằng gọi API; thêm loading/error states. Giữ `mockData` tạm làm tham chiếu seed rồi gỡ.
- Vite `server.proxy` cho `/api` → site Frappe.

## 8. Triển khai & kiểm thử

- `frappe_docker` gộp vào `docker-compose.yml` (mariadb, redis, frappe, scheduler, nginx) — chạy chung một lệnh.
- Test engines + API bằng `bench run-tests --app akf_farm` / pytest (TDD: viết test trước cho từng engine/endpoint).
- Script seed dữ liệu mẫu (2+ zone, vài block, tổ trưởng, tổ viên, quy trình Gấc+Sâm, vài crop cycle) để FE chạy thật.

## 9. Điều chỉnh so với plan `2026-06-14`

- **Bỏ** (đã là React): Gói 7 trang lịch Frappe; Gói 8.1/8.3 trang bản đồ Frappe page; Gói 10.2/10.3 PWA `www/akf`.
- **Giữ:** DocTypes (G2,3,4), toàn bộ engines (G5,6,8.2,11b), phân quyền (G12), seed + nghiệm thu (G13), cảnh báo không tự đổi lịch (G11).
- **Thêm mới:** lớp custom API khớp frontend; auth cho React (AuthContext + guard); gói tích hợp frontend (đổi mockData → API); deploy same-origin nginx.

## 10. Câu hỏi nghiệp vụ còn mở (không chặn kiến trúc)

6 câu trong spec GĐ1 (tần suất thu hoạch gấc, ngày bắt đầu chu kỳ, quy đổi công theo diện tích, mẫu file sheet, xử lý việc chưa xong trong ngày, xác nhận phân loại phạm vi). Engine nhận tham số cấu hình + dùng mặc định hợp lý cho tới khi chủ đầu tư trả lời.

## 11. Tiêu chí hoàn thành GĐ1 (acceptance)

Chạy trọn vòng: admin tạo zone/block + quy trình → hệ thống sinh việc 10 ngày + tự gán tổ trưởng → tổ trưởng (mobile) nhận việc, hoàn thành, báo cáo cuối ngày kèm ảnh, offline được → bản đồ nhiệt tô đúng (trộn màu theo tỷ lệ) → KPI tổ trưởng → cảnh báo quá hạn/bất thường (không tự đổi lịch) → admin lùi lịch độc lập theo cây. Tổ trưởng A không xem được dữ liệu tổ B.
