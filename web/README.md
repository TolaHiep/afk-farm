# 🌾 Farm Management System - Hệ Thống Quản Lý Nông Trại

Hệ thống quản lý sản xuất nông trại toàn diện với giao diện tiếng Việt, bao gồm Web Admin và Mobile PWA.

## ✨ Tính Năng Chính

### 🖥️ Web Admin (Desktop - 1440px)
- **Dashboard**: 4 KPI cards, biểu đồ, danh sách cần chú ý
- **Bản đồ nhiệt**: Visualize vùng/lô với màu trạng thái
- **Quản lý vùng & lô**: Tree table, thêm/sửa với bản đồ polygon
- **Quản lý tổ**: Tổ trưởng và tổ viên
- **Quy trình canh tác**: Gấc và Sâm, upload Excel
- **Chu kỳ cây trồng**: Khai báo và theo dõi
- **Lịch 10 ngày**: Calendar view, gán lại, lùi lịch
- **KPI tổ trưởng**: Biểu đồ và bảng chi tiết
- **Thông báo**: Quá hạn, bất thường, báo cáo
- **Chi tiết bất thường**: Ảnh, timeline, thao tác

### 📱 Mobile PWA (390px)
- **Việc hôm nay**: Danh sách thẻ lớn, màu trạng thái
- **Các ngày tới**: View theo từng ngày
- **Chi tiết việc**: SOP, nút lớn, chụp ảnh
- **Báo cáo cuối ngày**: Số liệu, bất thường, ảnh bắt buộc
- **Offline sync**: Lưu tạm, tự động đồng bộ
- **Thông báo**: Việc mới, lùi lịch, gán lại

## 🎨 Thiết Kế

- **Phong cách**: Gọn gàng, sáng, professional
- **Tông màu**: Trắng/xám, điểm nhấn xanh lá (#16a34a)
- **Trạng thái**:
  - 🟢 Xanh = Ổn định
  - 🟡 Vàng = Cần chú ý
  - 🔴 Đỏ = Quá hạn/Bất thường

## 🚀 Bắt Đầu

### Routes chính:

**Admin:**
- `/` - Đăng nhập Admin
- `/admin/dashboard` - Dashboard
- `/admin/heatmap` - Bản đồ nhiệt
- `/admin/zones` - Quản lý vùng/lô
- `/admin/teams` - Quản lý tổ
- `/admin/processes` - Quy trình
- `/admin/crop-cycles` - Chu kỳ cây
- `/admin/calendar` - Lịch 10 ngày
- `/admin/kpi` - KPI tổ trưởng
- `/admin/notifications` - Thông báo

**Mobile:**
- `/mobile/login` - Đăng nhập Mobile
- `/mobile/tasks` - Việc hôm nay
- `/mobile/upcoming` - Các ngày tới
- `/mobile/task/:id` - Chi tiết việc
- `/mobile/report` - Báo cáo cuối ngày
- `/mobile/offline` - Đồng bộ offline
- `/mobile/notifications` - Thông báo

## 📦 Công Nghệ

- React 18.3.1
- React Router 7 (Data mode)
- Tailwind CSS v4
- Recharts (Charts)
- Lucide React (Icons)
- TypeScript

## 📖 Tài Liệu

Xem file `SYSTEM-GUIDE.md` để biết hướng dẫn chi tiết về:
- Từng màn hình
- Luồng sử dụng (flows)
- Component library
- Dữ liệu mẫu

## 🎯 Prototype Flows

### Admin:
```
Login → Dashboard → Heatmap → Plot Detail → Calendar → Task Popup
```

### Admin Setup:
```
Zones → Teams → Processes → Crop Cycles → Auto-generate Tasks
```

### Team Leader:
```
Login → Today Tasks → Task Detail → Complete → Daily Report → Submit
```

### Offline:
```
No Network → Save Locally → Network Back → Auto Sync
```

## 📱 Mobile-First Features

- **Nút lớn**: Dễ chạm ngoài trời
- **Chữ lớn**: Dễ đọc dưới nắng
- **Tối đa 5-7 nút/màn**: Không quá phức tạp
- **Offline support**: Làm việc không cần mạng
- **Validation ảnh**: Bắt buộc cho bất thường

## 🔧 Cấu Trúc Project

```
src/
├── app/
│   ├── components/
│   │   ├── admin/         # 12 màn Admin
│   │   ├── mobile/        # 10 màn Mobile
│   │   ├── layouts/       # AdminLayout, MobileLayout
│   │   └── ui/            # StatusBadge, KPICard, Button
│   ├── lib/
│   │   └── mockData.ts    # Dữ liệu mẫu
│   ├── routes.tsx         # Router config
│   └── App.tsx            # Root component
└── styles/
    └── theme.css          # Tailwind theme
```

## 📝 Mock Data

Hệ thống có đầy đủ dữ liệu mẫu:
- 4 vùng, 6 lô
- 6 tổ trưởng, 4 tổ viên
- 2 quy trình (Gấc, Sâm)
- 6 chu kỳ cây trồng
- 10 công việc
- 3 bất thường
- Thông báo & KPI data

---

**Lưu ý**: Đây là hệ thống demo với dữ liệu mẫu. Trong production cần tích hợp API thực tế và database.
