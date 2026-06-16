# Nghiệm thu Giai đoạn 1 — AKF (cập nhật 16/06/2026)

Đối chiếu tiêu chí trong spec `2026-06-14-akf-gd1-overview-design.md` và `2026-06-16-akf-backend-erpnext-headless-design.md`.

## Trạng thái triển khai

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Môi trường Frappe v15 + app `akf_farm` | ✅ | site `akf.localhost`, app installed, developer_mode |
| Mô hình dữ liệu (11 DocType + 2 child) | ✅ | migrate sạch, test từng DocType |
| Engine: parse tần suất, due_dates, khử trùng lặp, quy đổi công | ✅ | 27 test thuần (pytest) |
| Engine: sinh việc 10 ngày, idempotent + scheduler hằng đêm | ✅ | test DB; seed sinh 36 việc |
| Engine: cân tải gán tổ trưởng | ✅ | test `assign_leaders` |
| Engine: trạng thái 3 màu + worst-of; trộn màu theo tỷ lệ (ở FE) | ✅ | test contract trọng số = `total` |
| Engine: KPI tổ trưởng | ✅ | test + endpoint `team_kpi` |
| Phân quyền 2 vai trò + giới hạn dữ liệu tổ trưởng | ✅ | role + permission_query, test |
| Lớp API custom khớp shape frontend | ✅ | 58 test bench xanh |
| Auth (login/me/logout) + route guard | ✅ | verify trình duyệt |
| Tích hợp frontend: toàn bộ màn admin + mobile đọc API | ✅ | build OK, verify Dashboard/Zones/HeatMap |
| Bản đồ nhiệt vệ tinh (trộn màu theo tỷ lệ) | ✅ | verify HeatMap render dữ liệu thật |
| Deploy same-origin 1 cổng 8080 | ✅ | curl + trình duyệt: login + API qua 8080 |
| Báo cáo bắt buộc ảnh; idempotent offline (client_uuid) | ✅ | test field_api |

## Kịch bản end-to-end đã chạy
1. Seed → sinh việc 10 ngày (idempotent: chạy lại không tạo trùng) ✅
2. Đăng nhập admin qua 8080 → Dashboard hiển thị 5 ha, 2 vùng, 4 lô, biểu đồ theo vùng ✅
3. Vùng & Lô → hiển thị Vùng A/B, lô + tiến độ theo cây (Gấc 0/9) ✅
4. Bản đồ nhiệt → tô màu vùng theo trạng thái (vàng = đến hạn chưa xong) ✅
5. Lùi lịch 1 việc độc lập theo cây (test `reschedule_task`) ✅
6. Tổ trưởng A không truy vấn được việc của tổ B (permission_query) ✅

## Đã tinh chỉnh (16/06/2026)
- `DailyReport`/`MobileSupport` (mobile): danh sách lô lấy từ API theo tổ trưởng đăng nhập (`field_api.my_plots`). ✅
- `CropCycleManagement`, `TeamLeaderKPI`: thay mảng mock (zones/plots/processes/reports/support/leaders) bằng API. ✅
- `TeamManagement`: dùng `plotIds` từ API thay helper mock. ✅
- CRUD vùng/lô (create/update/delete) + form `PlotForm` tạo/sửa + nút xóa `ZoneManagement` nối API. ✅ (admin tạo được vùng/lô qua giao diện)

## Điểm còn lại (việc tương lai / chờ dữ liệu — không chặn nghiệm thu lõi)
- `AnomalyDetail`/`TodayTasks` còn helper tra cứu tên từ mock (id backend chính là tên đọc được → hiển thị đúng); `OfflineSync` là demo hàng đợi offline.
- Bản đồ: tọa độ lô sinh theo lưới (geo.ts) thay vì `boundary` GeoJSON thật — `PlotForm` đã có công cụ vẽ ranh giới; sẽ lưu `boundary` khi hoàn thiện BoundaryMap → API.
- ERPNext chưa cài (Frappe-only) — để dành GĐ2/3 (kho/kế toán/truy xuất).
- Deploy VPS: cần đóng gói Frappe (gunicorn/supervisor) cùng compose thay cho `bench serve` dev.
- 6 câu hỏi nghiệp vụ còn mở của chủ đầu tư (tần suất thu hoạch gấc, ngày bắt đầu chu kỳ, mẫu file sheet...) — engine đã nhận tham số, chờ dữ liệu thật.
