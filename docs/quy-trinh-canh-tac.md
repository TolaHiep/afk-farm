# Quy trình canh tác mẫu (dữ liệu nguồn để hệ thống tự sinh việc)

Trích từ tài liệu "QUY TRÌNH CANH TÁC SÂM GẤC" của dự án. Mỗi bước gồm: mô tả, số công cho 1 ha, tần suất. Cột **Phạm vi** do đội thiết kế thêm để chống trùng lặp khi 1 lô trồng đồng thời 2 cây (xem mục "Chống xung đột" trong spec GĐ1).

Hai cột cuối (**Ước lượng (ngày)** và **Bước tiên quyết**) cho hệ thống biết thứ tự thực tế: một việc *1 lần/chu kỳ* chiếm bao nhiêu ngày, và việc nào phải XONG trước. Nhờ đó lịch tự sinh đúng trình tự (làm đất → gieo → chăm sóc → thu hoạch) thay vì dồn mọi việc vào ngày đầu. Việc lặp (Hàng ngày, N ngày/lần) không cần ước lượng — để `—`. Bỏ trống Bước tiên quyết (`—`) nghĩa là việc bắt đầu ngay từ đầu chu kỳ.

## Quy trình canh tác cây Sâm

| Bước | Mô tả | Công/ha | Tần suất | Phạm vi | Ước lượng (ngày) | Bước tiên quyết |
|---|---|---|---|---|---|---|
| 1 | Rải phân cải tạo đất | 2 | 1 lần/chu kỳ | Theo cây | 2 | — |
| 2 | Cày phay đất lên luống | 2 | 1 lần/chu kỳ | Theo cây | 2 | Rải phân cải tạo đất |
| 3 | Tưới ẩm mặt luống | 1 | 1 lần/chu kỳ | Theo cây | 1 | Cày phay đất lên luống |
| 4 | Phun chế phẩm sinh học | 3 | 1 lần/chu kỳ | Theo cây | 2 | Tưới ẩm mặt luống |
| 5 | Phủ màng nilon | 3 | 1 lần/chu kỳ | Theo cây | 2 | Phun chế phẩm sinh học |
| 6 | Xuống giống trồng | 2 | 1 lần/chu kỳ | Theo cây | 2 | Phủ màng nilon |
| 7 | Tưới vi sinh dinh dưỡng | 2 | 1 lần/chu kỳ | Theo cây | 1 | Xuống giống trồng |
| 8 | Chu kỳ bón lá | 1 | 20 ngày/lần | Theo cây | — | Xuống giống trồng |
| 9 | Chu kỳ bón củ | 2 | 30 ngày/lần | Theo cây | — | Xuống giống trồng |
| 10 | Thu hoạch thân lá Sâm | 1 | 75 ngày/lần | Theo cây | — | Xuống giống trồng |
| 11 | Thu hoạch củ Sâm | 2 | 1 lần/chu kỳ | Theo cây | 3 | Xuống giống trồng |
| 12 | Tưới mát | — | 2 lần/ngày | Dùng chung | — | Xuống giống trồng |
| 13 | Họp đầu ca sản xuất | — | Hàng ngày | Dùng chung | — | — |
| 14 | Họp tuần quản lý | — | 7 ngày/lần | Dùng chung | — | — |
| 15 | Họp tháng vùng trồng | — | 30 ngày/lần | Dùng chung | — | — |
| 16 | Loại cỏ dại và cây dại | — | Hàng ngày | Dùng chung | — | Xuống giống trồng |
| 17 | Kiểm tra và dặm cây | — | Hàng ngày | Dùng chung | — | Xuống giống trồng |
| 18 | Kiểm tra hệ thống tưới | — | Hàng ngày | Dùng chung | — | Xuống giống trồng |
| 19 | Kiểm tra sâu, bệnh | — | Hàng ngày | Dùng chung | — | Xuống giống trồng |
| 20 | Kiểm tra hiện tượng lạ | — | Hàng ngày | Dùng chung | — | Xuống giống trồng |
| 21 | Nhập số liệu sản xuất | — | Hàng ngày | Dùng chung | — | — |
| 22 | Báo cáo bất thường | — | Hàng ngày | Dùng chung | — | — |
| 23 | Quay về Bước 1 (lặp lại chu kỳ) | — | — | — | — | — |

## Quy trình canh tác cây Gấc

| Bước | Mô tả | Công/ha | Tần suất | Phạm vi | Ước lượng (ngày) | Bước tiên quyết |
|---|---|---|---|---|---|---|
| 1 | Đào hố trồng 60x60cm | 2 | 1 lần/chu kỳ | Theo cây | 2 | — |
| 2 | Ép cọc Giàn 400x500cm | 2 | 1 lần/chu kỳ | Theo cây | 2 | Đào hố trồng 60x60cm |
| 3 | Trộn hỗn hợp và lấp xuống hố | 1 | 1 lần/chu kỳ | Theo cây | 1 | Đào hố trồng 60x60cm |
| 4 | Ngâm ủ hỗn hợp dưới hố | 3 | 1 lần/chu kỳ | Theo cây | 3 | Trộn hỗn hợp và lấp xuống hố |
| 5 | Xuống giống trồng | 3 | 1 lần/chu kỳ | Theo cây | 1 | Ngâm ủ hỗn hợp dưới hố |
| 6 | Tưới vi sinh dinh dưỡng | 2 | 1 lần/chu kỳ | Theo cây | 1 | Xuống giống trồng |
| 7 | Bón phân nước định kỳ | 2 | 60 ngày/lần | Theo cây | — | Xuống giống trồng |
| 8 | Tỉa bỏ cây đực | 1 | 1 lần/chu kỳ | Theo cây | 1 | Xuống giống trồng |
| 9 | Ghép cây Hom vào Hạt | 2 | 1 lần/chu kỳ | Theo cây | 2 | Tỉa bỏ cây đực |
| 10 | Dẫn ngọn leo giàn | 1 | Hàng ngày | Theo cây | — | Xuống giống trồng |
| 11 | Thu hoạch quả Gấc | 2 | 7 ngày/lần | Theo cây | — | Xuống giống trồng |
| 12 | Tưới mát | — | 2 lần/ngày | Dùng chung | — | Xuống giống trồng |
| 13 | Họp đầu ca sản xuất | — | Hàng ngày | Dùng chung | — | — |
| 14 | Họp tuần với quản lý | — | 7 ngày/lần | Dùng chung | — | — |
| 15 | Họp tháng vùng trồng | — | 30 ngày/lần | Dùng chung | — | — |
| 16 | Loại cỏ dại và cây dại | — | Hàng ngày | Dùng chung | — | Xuống giống trồng |
| 17 | Kiểm tra và dặm cây | — | Hàng ngày | Dùng chung | — | Xuống giống trồng |
| 18 | Kiểm tra hệ thống tưới | — | Hàng ngày | Dùng chung | — | Xuống giống trồng |
| 19 | Kiểm tra sâu, bệnh | — | Hàng ngày | Dùng chung | — | Xuống giống trồng |
| 20 | Kiểm tra hiện tượng lạ | — | Hàng ngày | Dùng chung | — | Xuống giống trồng |
| 21 | Nhập số liệu sản xuất | — | Hàng ngày | Dùng chung | — | — |
| 22 | Báo cáo bất thường | — | Hàng ngày | Dùng chung | — | — |
| 23 | Quay về Bước 1 (lặp lại chu kỳ) | — | — | — | — | — |

> Số công thực tế cho một việc = (công/ha) × diện tích lô (ha). Việc "Dùng chung" sinh một lần cho block dù trồng 1 hay 2 cây.
>
> **Gấc thu hoạch theo mùa:** quả chín rải rác nên hái nhắc lại mỗi ~7 ngày trong vụ. Mô hình tần suất hiện chưa biểu diễn "chỉ trong mùa" — khi cần khoanh đúng cửa sổ thu hoạch, đặt mốc bắt đầu qua Bước "Bắt đầu sau N ngày" trên form quy trình.
