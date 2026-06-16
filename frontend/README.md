# AKF Web — Frontend

Giao diện hệ thống quản lý sản xuất nông trại AKF (bản thiết kế đã chốt với khách hàng).

## Công nghệ
Vite 6 · React 18 · TypeScript · React Router 7 · Tailwind CSS v4 · shadcn/ui (Radix) · Recharts · lucide-react.

## Chạy
```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tạo bản production trong dist/
npm run preview   # xem thử bản build
```

## Cấu trúc
```
web/
├── index.html              # điểm vào Vite (mount #root, nạp src/main.tsx)
├── vite.config.ts          # cấu hình Vite + alias @ -> src
├── tsconfig.json           # cấu hình TypeScript
├── package.json
└── src/
    ├── main.tsx            # khởi tạo React, render <App/>
    ├── App.tsx             # bọc RouterProvider
    ├── routes.tsx          # khai báo route admin + mobile
    ├── styles/             # theme + tailwind
    ├── lib/                # mockData (sẽ thay bằng API thật)
    └── components/
        ├── admin/          # màn quản trị (Dashboard, HeatMap, ...)
        ├── mobile/         # màn tổ trưởng (TodayTasks, DailyReport, ...)
        ├── layouts/        # AdminLayout, MobileLayout
        └── ui/             # shadcn/ui + KPICard, StatusBadge
```

## Tài khoản demo
Nhập email/mật khẩu bất kỳ để vào (chưa nối backend; dữ liệu trong `src/lib/mockData.ts`).

> Đường dẫn: `/` đăng nhập admin · `/admin/dashboard` · `/mobile/tasks`.
