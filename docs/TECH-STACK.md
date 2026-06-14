# TECH STACK CHÍNH THỨC — DỰ ÁN AKF

*Cập nhật: 15/06/2026. Tài liệu này chốt công nghệ dùng chung cho toàn dự án để tránh lẫn lộn.*

## Frontend (ĐÃ CHỐT)

Lấy bản thiết kế Figma làm chuẩn duy nhất. Đã loại bỏ 2 bản cũ (Next.js và HTML tĩnh).

| Thành phần | Công nghệ |
|---|---|
| Build tool | Vite 6 |
| Thư viện UI | React 18 + TypeScript |
| Định tuyến | React Router 7 |
| CSS | Tailwind CSS v4 |
| Bộ component | shadcn/ui (trên Radix UI) |
| Biểu đồ | Recharts |
| Icon | lucide-react |
| Animation | motion |
| Form | react-hook-form |
| Toast | sonner |

Vị trí: `web/`. Chạy: `cd web && npm install && npm run dev`.

**Đã dọn:** gỡ các thư viện thừa từ Figma không dùng tới (@mui/material, @emotion, react-slick, react-responsive-masonry, canvas-confetti, react-popper, @popperjs, react-dnd) — chỉ giữ shadcn/ui. Giảm từ 286 còn 216 gói. Build production OK.

## Backend (CHỜ CHỐT)

Đang chờ xác nhận với nhà đầu tư: tài liệu AKF_v0 (tư vấn tham khảo) đề xuất "lõi ERPNext". Vì nay dùng frontend React riêng, ERPNext chỉ còn vai trò backend/API. Ba phương án:

1. **ERPNext/Frappe headless** — giữ đúng đề xuất tài liệu khách; React gọi REST API. Tận dụng module kho/kế toán/truy xuất cho GĐ2/GĐ3. Nặng vận hành hơn, cần người biết Frappe.
2. **Node + NestJS + PostgreSQL** — cùng ngôn ngữ TypeScript với frontend (một stack, ít lẫn). Nhẹ, dễ bảo trì. Lệch đề xuất ERPNext.
3. **Python + FastAPI + PostgreSQL** — gọn nhẹ, hợp khi cần thêm AI/xử lý ảnh về sau.

> Câu hỏi quyết định cho nhà đầu tư: muốn ERPNext vì **giao diện có sẵn** (nay đã thay bằng React → không còn cần) hay vì **module nghiệp vụ** kho/kế toán/truy xuất ở GĐ2–3 (→ nên giữ ERPNext làm backend)?

## Hạ tầng

- Đóng gói: Docker. Chạy thử: máy local. Production: VPS, HTTPS, backup hằng đêm.
- Mã nguồn: Git (GitHub: TolaHiep/afk-farm).
