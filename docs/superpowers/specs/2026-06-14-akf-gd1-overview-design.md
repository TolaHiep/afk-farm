# SPEC — TỔNG QUAN HỆ THỐNG GIAI ĐOẠN 1 (cập nhật theo feedback khách hàng)

- Ngày: 14/06/2026
- Thay thế phần GĐ1 trong spec ngày 12/06; phần GĐ2/GĐ3 vẫn theo spec cũ.
- Bản trình bày cho khách: `Downloads/AKF_Tong-quan-he-thong_Giai-doan-1.docx`

## Quyết định mới (chốt với chủ dự án)

1. **2 tác nhân:** Admin (web) + Tổ trưởng (PWA). Tổ viên = danh sách dữ liệu, KHÔNG có tài khoản.
2. **Admin** tạo zone/block tùy ý (ranh giới tọa độ + diện tích), gán tổ trưởng; CRUD công việc; quản lý quy trình canh tác (nhập tay hoặc upload sheet); xem lịch 10 ngày; xem bản đồ nhiệt 3 màu; nhận cảnh báo + lùi lịch.
3. **Hệ thống tự sinh việc** từ quy trình canh tác + ngày bắt đầu chu kỳ; **tự cân đối tải gán tổ trưởng**, admin chỉnh tay được.
4. **Tổ trưởng** (điện thoại): nhận việc, đánh dấu hoàn thành, cuối ngày nhập số liệu + báo cáo bất thường kèm ảnh bắt buộc; offline được.
5. **Bản đồ nhiệt 3 màu:** xanh (ổn), vàng (đến hạn chưa xong / bất thường nhẹ), đỏ (quá hạn / bất thường chưa xử lý).
6. **Cảnh báo KHÔNG tự đổi lịch ngày sau**; admin chủ động lùi lịch.

## Chống xung đột khi 1 block trồng 2 cây (yêu cầu bắt buộc của khách)

1. Mỗi việc gắn nhãn block + cây + chu kỳ; dữ liệu tách bạch theo cây.
2. Mỗi bước quy trình có thuộc tính phạm vi: **Theo cây** (bước 1–11) vs **Dùng chung cả vùng** (bước 12–22).
3. Khử trùng lặp: việc dùng chung cùng block/ngày → gộp 1 việc.
4. Tính tải gộp cả 2 cây + việc chung khi gán tổ trưởng.
5. Màu block = mức xấu nhất giữa 2 cây.
6. Lùi lịch độc lập theo cây; việc dùng chung lùi theo block.

## Quy trình canh tác nguồn
Trích từ `docs/quy-trinh-canh-tac.md` (Sâm 23 bước, Gấc 23 bước). Số công = công/ha × diện tích lô.

## Câu hỏi còn mở (xem Mục 9 của docx)
Quy đổi công theo diện tích; tần suất thu hoạch gấc (thiếu trong nguồn); ngày bắt đầu chu kỳ; xác nhận phân loại phạm vi; mẫu file sheet; xử lý việc chưa xong trong ngày.
