# AKF — Quản lý sản xuất nông trại

Hệ thống quản lý sản xuất nông trại xen canh (Gấc leo giàn + Sâm dưới tán), gồm web admin và mobile PWA cho tổ trưởng. Backend Frappe v15 (headless) + custom app `akf_farm`; frontend React 18 + Vite.

## Trạng thái

- Backend GĐ1 + nhiều bản nâng cấp đã merge vào `main`: DocType + engine sinh việc (event-driven, prerequisite, "N lần/N ngày"), REST API, auth 2 vai trò, phân quyền tổ trưởng, ảnh hoàn thành **chống gian lận** (camera in-app + GPS + watermark), email SMTP, job tổng hợp hằng ngày, cascade xoá vùng/lô, sinh lại việc khi sửa quy trình/chu kỳ. **132 test xanh**.
- Frontend đầy đủ luồng admin + mobile: bản đồ nhiệt vệ tinh + heat blur, Vùng & Lô có 2 chế độ Danh sách/Lưới + mini-map vệ tinh từng vùng, lịch xem cả ngày quá khứ, thông báo tương tác (tab lọc + mark-read + deep-link), toast UI thay `alert`, logo + tên + 2 phụ đề cấu hình động trong Settings, phản hồi báo cáo/hỗ trợ trong app.
- Mobile: camera in-app + GPS + watermark; offline queue (idempotent); SOP theo bước; chống chồng lấn vùng/lô khi vẽ.

## Tài liệu

| File | Mục đích |
|---|---|
| `docs/TECH-STACK.md` | Công nghệ + thư viện + tiện ích tự xây |
| `docs/huong-dan-su-dung.md` | Vận hành + luồng admin/mobile + sao lưu |
| `docs/web-system-guide.md` | Mô tả từng màn web admin + mobile |
| `docs/huong-dan-tao-quy-trinh.md` | Mẫu khai báo quy trình canh tác |
| `docs/quy-trinh-canh-tac.md` | Nội dung quy trình nguồn (Gấc + Sâm) |

## Chạy DEV (live-edit, một lệnh)

```bash
cp .env.example .env       # đổi ADMIN_PASSWORD/HTTP_PORT nếu cần
docker compose up -d --build
```

Mở **http://localhost:${HTTP_PORT}** (mặc định `8080` trong `.env`). `docker compose` tự gộp `docker-compose.yml` + `docker-compose.override.yml`:
- Backend chạy `bench serve`, bind-mount `backend/akf_farm` → sửa `.py` auto-reload.
- Frontend chạy Vite dev server (service `web-dev`), bind-mount `frontend/` → React hot-reload.
- Kèm MariaDB + Redis + scheduler + workers + websocket. Site `akf.localhost` tự cài + migrate lần đầu; dữ liệu nằm trong Docker volume.

**Đăng nhập admin**: `admin` / `admin` (giá trị `ADMIN_PASSWORD` trong `.env`; username `admin` đã được gán cho `Administrator`).

Dừng: `docker compose down` (giữ dữ liệu) — `docker compose down -v` xoá luôn volume.

## Chạy PRODUCTION (không live-edit)

```bash
docker compose -f docker-compose.yml up -d --build
```

Bỏ qua file override; image nướng code; nginx phục vụ React đã build + proxy API. Triển khai VPS thật sẽ tách nhánh riêng — không kèm `docker-compose.override.yml`.

## Cấu trúc repo

- `backend/akf_farm/` — Frappe app (DocType, engine, API, hooks scheduler).
- `frontend/` — React SPA + Vite (dev) / nginx (prod).
- `deploy/` — Containerfile + tài nguyên build image backend.
- `docker-compose.yml` — production; `docker-compose.override.yml` — lớp DEV live-edit.
- `docs/` — tài liệu hệ thống.

## Lệnh hay dùng

```bash
# Test backend (132 test)
docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm'
# Test frontend (vitest, hàm thuần)
cd frontend && npx vitest run
# Migrate sau khi sửa DocType
docker compose exec backend bash -lc 'bench --site akf.localhost migrate'
# Sao lưu DB + file
docker compose exec backend bash -lc 'bench --site akf.localhost backup'
# Seed dữ liệu mẫu
docker compose exec backend bash -lc 'echo "import akf_farm.seed as s; s.run()" | bench --site akf.localhost console'
```

Repo: <https://github.com/TolaHiep/afk-farm>.
