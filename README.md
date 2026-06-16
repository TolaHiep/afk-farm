# Dự án phần mềm quản lý sản xuất nông trại AKF

Hệ thống quản lý sản xuất nông trại (gấc trên giàn + sâm đất dưới tán), xây dựng trên nền ERPNext v15 với custom app `akf_farm`.

## Trạng thái (cập nhật 16/06/2026)

- **Backend GĐ1 đã hoàn tất** (merge vào `main`): Frappe v15 headless + custom app `akf_farm` — DocTypes, engine sinh việc 10 ngày, REST API khớp frontend, auth 2 vai trò, phân quyền. **60 test xanh.**
- **Frontend đã nối API**: toàn bộ màn admin + mobile gọi backend (auth thật + route guard); admin tạo/sửa/xóa vùng-lô qua giao diện.
- **Chạy toàn stack 1 lệnh, cổng 80** (`docker compose up -d --build`). Xem `docs/huong-dan-su-dung.md`.
- Nghiệm thu & điểm còn lại: `docs/nghiem-thu-gd1.md`. Backend dev env: `docs/superpowers/specs/2026-06-16-akf-backend-erpnext-headless-design.md`.
- Còn chờ: ERPNext modules cho GĐ2/3, 6 câu hỏi nghiệp vụ của chủ đầu tư, đóng gói Frappe cho VPS.
- Báo giá GĐ1 đã chốt: **25.000.000đ** (50 công × 500.000đ, chưa VAT).

## Tài liệu trong repo

| Tài liệu | Vị trí | Mục đích |
|---|---|---|
| Spec tổng quan 3 giai đoạn | `docs/superpowers/specs/2026-06-12-akf-farm-design.md` | Định hướng GĐ1/2/3 (GĐ1 đã thay bằng bản 14/06) |
| Spec Giai đoạn 1 | `docs/superpowers/specs/2026-06-14-akf-gd1-overview-design.md` | Thiết kế GĐ1 hiện hành — căn cứ làm plan |
| Kế hoạch triển khai GĐ1 | `docs/superpowers/plans/2026-06-14-akf-gd1-implementation.md` | 14 gói phát triển, từng task + test |
| Quy trình canh tác nguồn | `docs/quy-trinh-canh-tac.md` | Dữ liệu để hệ thống tự sinh việc |
| Câu hỏi gửi nhà đầu tư | `docs/cau-hoi-nha-dau-tu.md` | Thông tin cần thu thập trước khi code |

Các bản trình bày cho khách (docx) nằm ở thư mục `Downloads/` (Tổng quan hệ thống GĐ1, Báo giá GĐ1, Tài liệu IT-BA).

## Giai đoạn 1 (MVP) — phạm vi

2 tác nhân (Admin + Tổ trưởng); admin tạo vùng/lô (ranh giới tọa độ + diện tích), số hóa quy trình canh tác; hệ thống tự sinh việc 10 ngày và tự gán tổ trưởng; tổ trưởng báo cáo trên điện thoại (offline + ảnh bắt buộc); bản đồ nhiệt 3 màu; KPI hiệu suất tổ trưởng; cảnh báo chậm/bất thường (không tự đổi lịch); chống xung đột khi 1 lô trồng 2 cây.

## Tech stack

Frontend: **Vite + React 18 + TS + React Router 7 + Tailwind v4 + shadcn/ui + Recharts** tại `frontend/`. Backend: **Frappe v15 + ERPNext headless**, custom app `akf_farm` tại `backend/akf_farm/`.

## Chạy toàn bộ bằng một lệnh (deploy)

    cp .env.example .env   # đổi mật khẩu khi deploy thật
    docker compose up -d --build

Mở http://localhost (cổng 80). Stack gồm: frontend (React/nginx) + Frappe v15
backend (gunicorn, scheduler, workers, websocket) + MariaDB + Redis. Site
`akf.localhost` được tạo & cài app `akf_farm` tự động lần đầu; dữ liệu lưu ở
Docker volume (bền qua restart). Cấu hình qua `.env` (xem `.env.example`:
SITE_NAME, ADMIN_PASSWORD, DB_ROOT_PASSWORD, HTTP_PORT, SEED_DEMO).

Dừng: `docker compose down` (giữ dữ liệu) — `docker compose down -v` xoá luôn volume.
Nếu lần đầu báo container thừa từ bản cũ: `docker compose down -v --remove-orphans`.

### Cấu trúc repo
- `backend/akf_farm/` — Frappe app (DocTypes, engine, API).
- `frontend/` — React SPA (Vite), nginx reverse-proxy `/api`,`/files`,`/socket.io` về backend.
- `deploy/` — Containerfile + resources build image backend.

### Dev (live-edit)
Vẫn dùng devcontainer frappe_docker (project `akf`, cổng 8000). App symlink ở
`backend/akf_farm`. Xem tài liệu/memory dev-env.

## Môi trường phát triển

Docker trên máy Windows. Production dự kiến: VPS, HTTPS, backup hằng đêm.
