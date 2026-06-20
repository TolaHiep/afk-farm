# TECH STACK — DỰ ÁN AKF

*Cập nhật: 20/06/2026.*

## Frontend (`frontend/`)

| Thành phần | Công nghệ |
|---|---|
| Build tool | Vite 6 |
| Library | React 18 + TypeScript |
| Routing | React Router 7 |
| CSS | Tailwind CSS v4 |
| Component primitives | Radix UI (qua shadcn/ui scaffolding — chỉ giữ những file đang dùng) |
| Map | Leaflet 1.9 + Esri World Imagery (ảnh vệ tinh, miễn phí, không cần key) |
| Icon | lucide-react |
| Form | react-hook-form (chưa dùng nhiều) |
| Toast | `lib/toast.tsx` (tự xây gọn — thay `sonner` cũ và `window.alert`) |
| Test | Vitest (chỉ test hàm thuần: geo, image, watermark, split, capture) |

**Self-built UI utilities** (`frontend/src/lib/`):
- `toast.tsx` — toast queue + listener, không phụ thuộc context provider.
- `useAppSettings.ts` — hook + cache cho tên/logo/phụ đề, fire event sau khi Settings lưu.
- `notificationsRead.ts` — localStorage track ID thông báo đã đọc (per-trình duyệt).
- `capture.ts` + `watermark.ts` — chuyển ảnh camera + GPS + giờ + tên lô thành blob có watermark.
- `offline.ts` — hàng đợi gửi báo cáo/hỗ trợ/hoàn thành khi mất mạng (idempotent qua `client_uuid`).
- `geo.ts` — parse GeoJSON polygon, tính diện tích trắc địa, point-in-polygon.

Chạy: `docker compose up -d --build` (xem `huong-dan-su-dung.md`).

## Backend (`backend/akf_farm/`)

| Thành phần | Công nghệ |
|---|---|
| Framework | Frappe v15 (headless) |
| App | `akf_farm` — custom DocTypes, engine sinh việc, REST API tại `/api/method/akf_farm.api.*` |
| Database | MariaDB 11 |
| Cache/queue | Redis (cache + queue tách 2 instance) |
| Scheduler | Frappe scheduler (sinh việc cuốn chiếu, đánh dấu quá hạn, email tổng hợp hằng ngày) |
| Worker | Frappe queue-short + queue-long |
| Email | SMTP qua `smtplib` (cấu hình trong AKF Settings) |
| Test | `bench run-tests --app akf_farm` — 132 test |

**DocType chính**: Farm Zone, Farm Block, Cultivation Process + Cultivation Step (child), Crop Cycle, Farm Task + Farm Task Photo (child), Team Member, Team Leader Report, Support Request, Abnormal Report, Daily Production, AKF Settings (single).

**Engine** (`backend/akf_farm/akf_farm/engine/`): `task_generator` (sinh việc theo bước/tần suất/tiên quyết), `status_calculator` (3 màu worst-of), `assign_leaders` (cân tải).

## Hạ tầng

- **Docker Compose** một file gốc + override DEV. Stack: `backend`, `web-dev` (Vite dev / nginx prod), `db` (MariaDB), `redis-cache`, `redis-queue`, `scheduler`, `queue-short`, `queue-long`, `websocket`.
- Đồng nhất same-origin (cổng `8080` mặc định) → frontend gọi `/api/method/...` qua proxy nginx/Vite, dùng chung phiên cookie Frappe.
- **Repo**: GitHub `TolaHiep/afk-farm`.
- **Bản đồ**: dùng ảnh vệ tinh Esri World Imagery (raster tile, không cần API key).
