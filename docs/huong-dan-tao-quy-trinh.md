# Hướng dẫn tạo Quy trình canh tác

Hệ thống dùng quy trình để **tự sinh lịch công việc hằng ngày** cho tổ trưởng. Tài liệu này để khách
cung cấp quy trình chuẩn cho từng cây (Gấc, Sâm).

## Bước 1 — Thông tin quy trình

| Mục | Nhập gì |
|---|---|
| Tên quy trình | Ví dụ "Quy trình Gấc" |
| Cây | Gấc hoặc Sâm |
| Số ngày 1 chu kỳ | Một lứa kéo dài bao nhiêu ngày (Gấc ≈ 7300, Sâm ≈ 1095) |

## Bước 2 — Nhập từng bước công việc

Mỗi bước điền các cột sau. Cột **Vì sao cần** giải thích ngắn gọn lý do hệ thống cần dữ liệu đó.

| Cột | Nhập gì | Vì sao cần |
|---|---|---|
| **Tên việc** | Mô tả công việc | Để hiển thị đầu việc cho tổ trưởng |
| **Tần suất** | Chọn: *1 lần/chu kỳ* · *Hàng ngày* · *N lần / N ngày* (điền Số lần X + Mỗi Y ngày) | Để sinh đúng nhịp lặp |
| **Số ngày ước lượng** | Chỉ với *1 lần/chu kỳ*: việc này làm xong trong mấy ngày | Để **dự báo** ngày các việc kế tiếp (việc sau bắt đầu khi việc trước ước lượng xong) |
| **Công/ha** | Số công lao động cho 1 hecta (việc quản lý để trống) | Để chia tổ trưởng công bằng theo khối lượng |
| **Phạm vi** | *Theo cây* (riêng từng cây) hoặc *Dùng chung* (1 lần cho cả lô) | Để không nhân đôi việc chung / không thiếu việc riêng |
| **Bắt đầu** | *Ngay* hoặc *Sau N ngày* | Để đặt mốc thời gian |
| **Bước tiên quyết** | Bước phải XONG trước (tùy chọn) | Để sắp đúng thứ tự — gieo xong mới tới chăm sóc |
| **Yêu cầu ảnh** | "x" nếu cần chụp ảnh khi xong | Để nghiệm thu |

**Vì sao phải nhập kỹ:** khai báo đủ tần suất, thứ tự (tiên quyết), ước lượng và phạm vi thì hệ thống
mới **tự dự báo và lấp đủ lịch 10 ngày** đúng trình tự, đúng khối lượng — thay vì dồn mọi việc vào ngày
đầu hoặc sinh việc vô lý (tưới trước khi gieo).

## Ví dụ — Quy trình Gấc (rút gọn)

**Số ngày 1 chu kỳ:** 7300

| STT | Tên việc | Tần suất | Số ngày ước lượng | Công/ha | Phạm vi | Bắt đầu | Bước tiên quyết | Ảnh |
|---|---|---|---|---|---|---|---|---|
| 1 | Đào hố trồng 60x60cm | 1 lần/chu kỳ | 2 | 2 | Theo cây | Ngay | — | x |
| 2 | Ép cọc giàn | 1 lần/chu kỳ | 2 | 2 | Theo cây | Ngay | Đào hố trồng 60x60cm | |
| 3 | Ngâm ủ hỗn hợp | 1 lần/chu kỳ | 3 | 1 | Theo cây | Ngay | Ép cọc giàn | |
| 4 | Xuống giống trồng | 1 lần/chu kỳ | 1 | 3 | Theo cây | Ngay | Ngâm ủ hỗn hợp | x |
| 5 | Tưới mát | N lần / N ngày — 2 lần / 1 ngày | — | — | Dùng chung | Ngay | Xuống giống trồng | |
| 6 | Bón phân nước | N lần / N ngày — 1 lần / 60 ngày | — | 2 | Theo cây | Ngay | Xuống giống trồng | |
| 7 | Kiểm tra sâu, bệnh | Hàng ngày | — | — | Dùng chung | Ngay | Xuống giống trồng | |
| 8 | Thu hoạch quả Gấc | N lần / N ngày — 1 lần / 7 ngày | — | 2 | Theo cây | Sau 240 ngày | Xuống giống trồng | x |

Đọc nhanh: Đào hố làm 2 ngày → Ép cọc bắt đầu sau đó → Ngâm ủ 3 ngày → Xuống giống. Các việc chăm sóc
(tưới, bón, kiểm tra) chỉ bắt đầu sau khi gieo. "Tưới mát 2 lần/ngày" → mỗi ngày 2 đầu việc.

## Mẫu trống (điền cho mỗi cây)

**Quy trình:** ____________ · **Cây:** Gấc / Sâm · **Số ngày 1 chu kỳ:** ______

| STT | Tên việc | Tần suất | Số ngày ước lượng | Công/ha | Phạm vi | Bắt đầu | Bước tiên quyết | Ảnh |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |
| … | | | | | | | | |
