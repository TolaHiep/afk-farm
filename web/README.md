# 🌾 Hệ thống Quản lý Sản xuất Nông trại

Ứng dụng quản lý sản xuất nông trại thông minh với 2 giao diện: **Web Admin** cho quản trị viên và **Mobile PWA** cho tổ trưởng.

## 🎯 Tính năng chính

### Web Admin (Desktop)
- **Dashboard**: Tổng quan số liệu, thẻ KPI, biểu đồ công việc
- **Bản đồ Nhiệt**: Giám sát trạng thái các lô trồng (xanh/vàng/đỏ)
- **Quản lý Vùng & Lô**: Tạo, sửa, xóa các vùng trồng và lô ruộng
- **Quản lý Tổ**: Quản lý tổ trưởng và thành viên tổ
- **Quy trình Canh tác**: Thiết lập SOP cho Gấc/Sâm + Import Excel
- **Chu kỳ Cây trồng**: Khai báo chu kỳ canh tác, tự sinh công việc
- **Lịch Công việc**: Xem 10 ngày tới, gán lại/lùi lịch công việc
- **KPI Tổ trưởng**: Đánh giá hiệu suất (đúng hạn, quá hạn, bất thường)
- **Cảnh báo**: Thông báo quá hạn, bất thường, vật tư thiếu

### Mobile PWA (Tổ trưởng)
- **Việc hôm nay**: Danh sách thẻ lớn, tabs ngày (hôm nay/ngày mai/ngày kia)
- **Chi tiết công việc**: SOP, nút Bắt đầu/Hoàn thành, ghi chú
- **Báo cáo cuối ngày**: Nhập số liệu sản xuất, báo cáo bất thường (kèm ảnh)
- **Offline mode**: Lưu báo cáo khi mất mạng, đồng bộ khi có mạng
- **Nhớ đăng nhập**: Trải nghiệm user-friendly

## 🏗️ Kiến trúc

```
app/
├── admin/                    # Web Admin (Desktop)
│   ├── login/
│   ├── page.tsx (Dashboard)
│   ├── zones/
│   ├── teams/
│   ├── processes/
│   ├── crop-cycles/
│   ├── schedule/
│   ├── heat-map/
│   ├── kpi/
│   └── alerts/
│
├── mobile/                   # Mobile PWA (Tổ trưởng)
│   ├── login/
│   ├── page.tsx (Việc hôm nay)
│   ├── task-detail/[id]/
│   └── daily-report/
│
└── components/
    ├── admin/
    │   └── sidebar.tsx
    └── shared/
```

## 🎨 Design System

### Màu sắc
- **Xanh lá**: #27AE60 (Primary - Agricultural green)
- **Xám đậm**: #2C3E50 (Sidebar background)
- **Trắng/Xám nhạt**: #FFFFFF / #F5F5F5 (Content area)
- **Đỏ**: #E74C3C (Alerts - Overdue)
- **Vàng**: #F39C12 (Warnings)

### Typography
- **Font**: Geist Sans + Geist Mono (Google Fonts)
- **Heading**: Bold, 24-32px
- **Body**: Regular, 14-16px
- **Mobile**: Chữ lớn (16-18px) cho dễ đọc ngoài trời

## 🚀 Bắt đầu

### Cài đặt
```bash
pnpm install
pnpm dev
```

### Truy cập
- **Admin**: http://localhost:3000/admin/login
  - Email: admin@nongrai.vn
  - Password: bất kỳ
  
- **Mobile**: http://localhost:3000/mobile/login
  - Email: totruong@nongrai.vn
  - Password: bất kỳ

- **Home**: http://localhost:3000

## 📦 Dependencies

- **Next.js 16**: Framework chính
- **React 19**: UI library
- **Tailwind CSS 4**: Styling
- **shadcn/ui**: Prebuilt UI components
- **Zustand**: State management
- **react-hook-form + zod**: Form validation
- **recharts**: Charts & data visualization
- **leaflet**: Map integration (ready for heatmap)
- **react-hot-toast**: Notifications
- **framer-motion**: Animations

## 🔌 Integrations Ready

- **Database**: Neon PostgreSQL (for backend)
- **Maps**: Leaflet/Mapbox (for heatmap)
- **Storage**: Vercel Blob (for photos)
- **Auth**: Better Auth (recommended) hoặc custom

## 📱 PWA Features

- `manifest.json` configured cho installable PWA
- Service Worker ready (workbox-window installed)
- Mobile-first responsive design
- Offline support skeleton

## 🎯 Luồng chính

### Admin thiết lập (Lần đầu)
1. Tạo Vùng & Lô → Quản lý Tổ → Thiết lập Quy trình → Khai báo Chu kỳ
2. Hệ thống tự sinh công việc theo quy trình

### Admin theo dõi (Hàng ngày)
1. Dashboard → Bản đồ Nhiệt → Kiểm tra vùng đỏ
2. Gán lại / Lùi lịch công việc → KPI

### Tổ trưởng (Hàng ngày)
1. Việc hôm nay → Chi tiết → Bắt đầu/Hoàn thành
2. Báo cáo cuối ngày → Gửi

## ⚠️ Cảnh báo

- Khi công việc quá hạn: Block → đỏ trên bản đồ nhiệt
- Khi có bất thường: Block → vàng/đỏ, gửi thông báo
- Không tự động đổi lịch (Admin quyết định reschedule)

## 🔮 Tiếp theo

- Kết nối API backend
- Thêm geospatial queries cho bản đồ
- Push notifications khi có cảnh báo
- Export báo cáo PDF
- Analytics dashboard
- Real-time sync WebSocket

---

**Version**: 1.0.0  
**Made with ❤️ for Agricultural Management**
