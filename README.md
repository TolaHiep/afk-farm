# Dự án phần mềm quản lý sản xuất nông trại AKF

Hệ thống quản lý sản xuất nông trại (gấc trên giàn + sâm đất dưới tán), xây dựng trên nền ERPNext v15 với custom app `akf_farm`.

## Trạng thái (cập nhật 14/06/2026)

- Đã hoàn tất thiết kế và kế hoạch triển khai **Giai đoạn 1 (MVP)**.
- Báo giá GĐ1 đã chốt: **25.000.000đ** (50 công × 500.000đ, chưa VAT).
- **Chưa code.** Chờ chủ đầu tư cung cấp thông tin Nhóm A và trả lời 6 câu hỏi còn mở trong spec GĐ1.
- Git: **chỉ có repo cục bộ, chưa có remote / chưa push lên GitHub.**

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

## Tech stack (đã chốt frontend)

Xem `docs/TECH-STACK.md`. Frontend chuẩn: **Vite + React 18 + TS + React Router 7 + Tailwind v4 + shadcn/ui + Recharts** tại `web/` (đã gom về một bản, bỏ Next.js và HTML tĩnh). Backend đang chờ chốt (ERPNext headless / NestJS / FastAPI).

## Chạy frontend

```
cd web
npm install
npm run dev      # mở http://localhost:5173
```

## Môi trường phát triển

Docker trên máy Windows. Production dự kiến: VPS, HTTPS, backup hằng đêm.
