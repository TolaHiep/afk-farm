# Prototype giao diện AKF — Giai đoạn 1

Bản mẫu giao diện **bấm được** để chốt thiết kế với khách hàng. Dữ liệu là minh hoạ, **chưa nối backend**.

## Cách mở
Mở file `index.html` bằng trình duyệt (double-click). Từ trang chọn, vào:
- **Bảng điều hành (Admin)** → `admin.html`
- **Ứng dụng Tổ trưởng** → `mobile.html`

> Cần kết nối Internet ở lần mở đầu để tải font (Be Vietnam Pro, Lora). Bản đồ vẽ bằng SVG nên không cần dịch vụ bản đồ ngoài.

## Phạm vi giao diện
**Admin (web):** Bảng điều hành · Bản đồ nhiệt 3 màu (bấm lô xem chi tiết) · Vùng & Lô (có demo vẽ ranh giới) · Quy trình canh tác (Sâm/Gấc, đánh dấu Theo cây / Dùng chung) · Lịch 10 ngày (bấm việc → gán lại / lùi lịch) · KPI tổ trưởng.

**Tổ trưởng (điện thoại):** Việc hôm nay · Chi tiết việc (Bắt đầu/Hoàn thành) · Báo cáo cuối ngày (số liệu + bất thường + ảnh bắt buộc) · banner offline.

## Công nghệ
HTML + CSS + JavaScript thuần (không build), SVG cho bản đồ. Đây là bản mock để duyệt; khi chốt sẽ dựng lại bằng thành phần giao diện tích hợp ERPNext + app tổ trưởng (PWA) theo kế hoạch triển khai.

## Cấu trúc
```
frontend/
├── index.html      # trang chọn
├── admin.html      # app quản trị
├── mobile.html     # app tổ trưởng (khung điện thoại)
└── assets/
    ├── styles.css  # thiết kế (màu, font, thành phần)
    ├── data.js     # dữ liệu mẫu
    └── admin.js    # logic màn admin
```
