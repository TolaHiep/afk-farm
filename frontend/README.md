# AKF Frontend

React SPA cho hệ thống AKF (web admin + mobile PWA cho tổ trưởng). Gọi REST API tại `/api/method/akf_farm.api.*` same-origin với backend Frappe.

## Công nghệ

Vite 6 · React 18 · TypeScript · React Router 7 · Tailwind CSS v4 · Radix UI (shadcn/ui primitives) · **Leaflet 1.9 + Esri World Imagery** (ảnh vệ tinh) · lucide-react. Toast tự xây (`lib/toast.tsx`). Test: Vitest cho hàm thuần.

## Chạy

Khuyến nghị qua Docker Compose ở repo root (`docker compose up -d --build`) — service `web-dev` chạy Vite dev server với bind-mount `frontend/`, hot-reload sẵn.

Chạy trực tiếp (không Docker):

```bash
npm install
npm run dev       # Vite mặc định cổng 5173
npm run build     # dist/
npm run preview
npx vitest run    # test (geo, image, watermark, split, capture)
```

Lưu ý: chạy trực tiếp cần backend Frappe trên `http://localhost:8000` (đặt `VITE_API_BASE` trong `.env` nếu khác).

## Cấu trúc

```
frontend/
├── index.html              # entry Vite (mount #root)
├── vite.config.ts          # alias + proxy /api -> backend
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx            # render <App/> + <Toaster/>
    ├── App.tsx             # RouterProvider
    ├── routes.tsx          # khai báo route admin + mobile
    ├── styles/             # Tailwind + theme
    ├── lib/
    │   ├── api.ts                # wrapper fetch + parse _server_messages của Frappe
    │   ├── queries.ts            # client API (tất cả endpoint akf_farm)
    │   ├── auth.tsx              # AuthProvider + useAuth (login/logout/refresh)
    │   ├── toast.tsx             # toast queue + Toaster component (thay window.alert)
    │   ├── useAppSettings.ts     # cache + listener cho logo/tên/phụ đề
    │   ├── notificationsRead.ts  # localStorage track ID đã đọc
    │   ├── capture.ts            # toPhotoMeta + photoFlag (admin xem cờ GPS)
    │   ├── watermark.ts          # đốt giờ+GPS+tên lô lên ảnh canvas
    │   ├── offline.ts            # hàng đợi báo cáo/hoàn thành offline (idempotent)
    │   ├── image.ts              # nén ảnh ONLINE/OFFLINE
    │   ├── geo.ts                # parse GeoJSON, diện tích trắc địa, point-in-polygon
    │   ├── usePhotoPicker.tsx    # chọn nhiều ảnh + thumbnail
    │   └── today.ts              # YMD local
    └── components/
        ├── admin/          # 14 màn admin (Dashboard, HeatMap, ZoneManagement, ...)
        ├── mobile/         # 9 màn mobile (TodayTasks, TaskDetail, DailyReport, ...)
        ├── layouts/        # AdminLayout (sidebar + avatar) + MobileLayout (topbar + bottom nav)
        └── ui/             # primitives đang dùng (Button, StatusBadge, FormModal)
```

## Tài khoản

- **Admin**: `admin` / `admin` (cấu hình qua `ADMIN_PASSWORD` ở `.env` root).
- **Tổ trưởng**: số điện thoại (username) + mật khẩu. Admin tạo trong "Tổ & Tổ viên".

Route chính: `/` đăng nhập admin · `/admin/dashboard` · `/mobile/login` · `/mobile/tasks`.
