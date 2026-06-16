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

## Chạy DEV (mặc định — live-edit, một lệnh)

    cp .env.example .env
    docker compose up -d --build

Mở http://localhost (cổng 80). `docker compose` tự gộp `docker-compose.yml` +
`docker-compose.override.yml` → ra **bản dev live-edit**:
- **Backend** chạy `bench serve` + bind-mount `backend/akf_farm` → sửa `.py` auto-reload (không cần build lại).
- **Frontend** chạy Vite dev server (service `web-dev`) bind-mount `frontend/` → sửa React hot-reload ngay trên trình duyệt.
- Kèm MariaDB + Redis + scheduler + workers + websocket. Site `akf.localhost`
  tạo & cài `akf_farm` + migrate tự động lần đầu; dữ liệu ở Docker volume (bền qua restart).

Đăng nhập admin: `admin` / `admin123` (mật khẩu = `ADMIN_PASSWORD` trong `.env`; user `Administrator` đã được gắn username `admin`). Muốn có
dữ liệu mẫu: đặt `SEED_DEMO=1` rồi `docker compose down -v && docker compose up -d`,
hoặc seed thủ công: `docker compose exec backend bash -lc 'echo "import akf_farm.seed as s; s.run()" | bench --site akf.localhost console'`.

Dừng: `docker compose down` (giữ dữ liệu) — `docker compose down -v` xoá luôn volume.

## Chạy như PRODUCTION (không live-edit)

Bỏ qua file override, dùng riêng compose base (image nướng code, gunicorn, nginx tĩnh):

    docker compose -f docker-compose.yml up -d --build

(Khi triển khai VPS thật sẽ tách thành nhánh git riêng — không kèm `docker-compose.override.yml`.)

### Cấu trúc repo
- `backend/akf_farm/` — Frappe app (DocTypes, engine, API).
- `frontend/` — React SPA (Vite); nginx (production) reverse-proxy `/api`,`/files`,`/socket.io` về backend.
- `deploy/` — Containerfile + resources build image backend.
- `docker-compose.yml` — định nghĩa production; `docker-compose.override.yml` — lớp dev live-edit.

## Môi trường phát triển

Docker trên máy Windows. Production dự kiến: VPS, HTTPS, backup hằng đêm.
