# Hướng dẫn xây dựng Quy trình canh tác

> Tài liệu gửi khách hàng. Mục đích: thu thập **quy trình chuẩn** cho từng loại cây (Gấc, Sâm) để hệ thống AKF **tự động sinh lịch công việc** cho tổ trưởng mỗi ngày.

---

## 1. Quy trình là gì?

Một **quy trình** = danh sách các **bước công việc** cho **một loại cây**, thực hiện lặp lại theo chu kỳ trồng.

Khi một lô bắt đầu trồng (tạo một **chu kỳ cây**), hệ thống áp quy trình tương ứng và **tự sinh ra các đầu việc theo ngày** cho tổ trưởng — không phải giao việc thủ công.

Vì vậy quy trình càng khai báo đúng, lịch sinh ra càng sát thực tế.

---

## 2. Thông tin cần khai báo cho MỖI quy trình

| Mục | Ý nghĩa | Ví dụ |
|---|---|---|
| **Tên quy trình** | Đặt tên dễ nhận | "Quy trình Gấc" |
| **Cây** | Gấc hoặc Sâm | Gấc |
| **Số ngày 1 chu kỳ** | Một lứa trồng kéo dài bao nhiêu ngày → việc lặp dừng khi hết chu kỳ | Gấc ≈ 7300 ngày (20 năm); Sâm ≈ 1095 ngày (3 năm) |

---

## 3. Thông tin cần khai báo cho MỖI bước (việc)

Mỗi bước trong quy trình gồm các cột sau:

| Cột | Ý nghĩa | Cách điền |
|---|---|---|
| **1. STT** | Thứ tự thực hiện | 1, 2, 3… (đúng trình tự ngoài đồng) |
| **2. Tên việc** | Mô tả công việc | "Đào hố trồng", "Tưới mát"… |
| **3. Tần suất** | Việc lặp thế nào | Chọn 1 trong 3 loại (xem mục 3.1) |
| **4. Công/ha** | Số công lao động cho 1 hecta (để tính khối lượng & chia tổ trưởng) | Số (vd 2). Việc không tốn công riêng (họp, kiểm tra) → để trống/0 |
| **5. Phạm vi** | Làm riêng từng cây hay chung cả lô | "Theo cây" hoặc "Dùng chung" (xem 3.2) |
| **6. Bắt đầu** | Bắt đầu ngay hay sau bao lâu | "Ngay" hoặc "Sau N ngày" |
| **7. Bước tiên quyết** | Bước nào phải XONG trước thì việc này mới bắt đầu | Tên một bước trước đó, hoặc để trống |
| **8. Yêu cầu ảnh** | Tổ trưởng phải chụp ảnh khi hoàn thành? | "x" = có, để trống = không |

### 3.1. Ba loại Tần suất

| Loại | Khi nào dùng | Cần điền thêm |
|---|---|---|
| **1 lần/chu kỳ** | Việc chỉ làm đúng 1 lần mỗi lứa trồng (đào hố, gieo, ép cọc…) | — |
| **Hàng ngày** | Việc làm mỗi ngày | — |
| **N lần / N ngày** | Mọi nhịp khác — điền **Số lần (X)** và **Mỗi (Y) ngày** | X và Y |

Ví dụ "N lần / N ngày":
- Tưới mát **2 lần mỗi ngày** → X = **2**, Y = **1**.
- Bón phân **1 lần mỗi 60 ngày** → X = **1**, Y = **60**.
- Họp tuần **1 lần mỗi 7 ngày** → X = **1**, Y = **7**.

> Khi X > 1, mỗi ngày hệ thống sinh **X đầu việc** ("lần 1/2", "lần 2/2") để tổ trưởng đánh dấu từng lần.

### 3.2. Phạm vi: "Theo cây" vs "Dùng chung"

Mỗi lô trồng đồng thời **Gấc (giàn trên)** + **Sâm (dưới đất)**. Vì vậy:
- **Theo cây**: việc làm riêng cho từng cây → mỗi lô sinh 2 việc (Gấc riêng, Sâm riêng). VD: bón phân, tỉa cành, thu hoạch.
- **Dùng chung**: việc làm **1 lần cho cả lô** dù trồng 2 cây → chỉ sinh 1 việc. VD: họp đầu ca, kiểm tra hệ thống tưới, loại cỏ dại, tưới mát.

---

## 4. Cách hệ thống sinh lịch (để hiểu logic)

- **Bước KHÔNG có tiên quyết**: bắt đầu từ **ngày gieo trồng** + số ngày ở cột "Bắt đầu".
- **Bước CÓ tiên quyết**: **chỉ xuất hiện sau khi** bước tiên quyết được tổ trưởng **đánh dấu hoàn thành**; tính mốc từ ngày hoàn thành đó + "Bắt đầu sau N ngày".
- Việc lặp (Hàng ngày / N lần-N ngày) lặp **đến khi hết "Số ngày 1 chu kỳ"**.

> **Lợi ích:** Ngày đầu chỉ hiện các việc thiết lập (đào hố, gieo…). Việc chăm sóc (tưới, tỉa) chỉ xuất hiện **sau khi gieo trồng xong** — đúng thực tế, không bị dồn hàng chục việc vào ngày đầu.

---

## 5. Yêu cầu khi cung cấp quy trình (checklist cho khách)

- [ ] Liệt kê **đầy đủ** các bước theo **đúng thứ tự** thực hiện ngoài đồng.
- [ ] Mỗi bước ghi rõ **tần suất** (nếu "N lần/N ngày" thì ghi cả X và Y).
- [ ] Ghi **công/ha** cho việc có tốn công lao động (để chia tổ trưởng); việc quản lý/kiểm tra để trống.
- [ ] Phân loại **phạm vi** (Theo cây / Dùng chung) cho từng bước.
- [ ] Chỉ rõ **bước tiên quyết**: đặc biệt nhóm **thiết lập** (đào hố → gieo → tưới vi sinh) phải hoàn thành trước nhóm **chăm sóc** (tưới, tỉa…). Cách làm: đặt các bước chăm sóc có "Bước tiên quyết" = bước gieo trồng.
- [ ] Cung cấp **Số ngày 1 chu kỳ** của mỗi cây.
- [ ] Việc **thu hoạch**: ghi "Bắt đầu sau bao nhiêu ngày kể từ trồng" + nhịp lặp (X lần / Y ngày).

---

## 6. Ví dụ minh hoạ — Quy trình Gấc (rút gọn)

**Cây:** Gấc · **Số ngày 1 chu kỳ:** 7300 (20 năm)

| STT | Tên việc | Tần suất | Công/ha | Phạm vi | Bắt đầu | Bước tiên quyết | Ảnh |
|---|---|---|---|---|---|---|---|
| 1 | Đào hố trồng 60x60cm | 1 lần/chu kỳ | 2 | Theo cây | Ngay | — | x |
| 2 | Ép cọc giàn | 1 lần/chu kỳ | 2 | Theo cây | Ngay | Đào hố trồng 60x60cm | |
| 3 | Xuống giống trồng | 1 lần/chu kỳ | 3 | Theo cây | Ngay | Ép cọc giàn | x |
| 4 | Tưới vi sinh dinh dưỡng | 1 lần/chu kỳ | 2 | Theo cây | Sau 1 ngày | Xuống giống trồng | |
| 5 | Tưới mát | N lần/N ngày — **2 lần / 1 ngày** | — | Dùng chung | Ngay | Xuống giống trồng | |
| 6 | Dẫn ngọn leo giàn | Hàng ngày | 1 | Theo cây | Ngay | Xuống giống trồng | |
| 7 | Bón phân nước định kỳ | N lần/N ngày — **1 lần / 60 ngày** | 2 | Theo cây | Ngay | Xuống giống trồng | |
| 8 | Kiểm tra sâu, bệnh | Hàng ngày | — | Dùng chung | Ngay | — | |
| 9 | Thu hoạch quả Gấc | N lần/N ngày — **1 lần / 7 ngày** | 2 | Theo cây | Sau 240 ngày | Xuống giống trồng | x |

**Đọc hiểu ví dụ:**
- Ngày gieo: hệ thống sinh bước 1 (Đào hố). Bước 2, 3 chờ bước trước hoàn thành mới hiện (chuỗi tiên quyết).
- Sau khi "Xuống giống" xong: các bước 4–7, 9 mới bắt đầu (vì tiên quyết = Xuống giống). Bước 8 (kiểm tra) chạy hàng ngày độc lập.
- Bước 5 "Tưới mát" 2 lần/ngày → mỗi ngày 2 việc "(lần 1/2)", "(lần 2/2)", và là **Dùng chung** nên cả lô chỉ 1 cặp việc dù trồng 2 cây.
- Bước 9 "Thu hoạch" bắt đầu sau 240 ngày kể từ trồng, rồi lặp mỗi 7 ngày tới hết chu kỳ.

---

## 7. Mẫu trống để khách điền

**Quy trình:** ____________  · **Cây:** Gấc / Sâm  · **Số ngày 1 chu kỳ:** ______

| STT | Tên việc | Tần suất (loại + X lần/Y ngày) | Công/ha | Phạm vi | Bắt đầu (ngay / sau N ngày) | Bước tiên quyết | Ảnh |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| … | | | | | | | |

> Khách điền 1 bảng cho **mỗi loại cây**. Gửi lại file này (hoặc bảng tương đương) cho đội kỹ thuật để nhập vào hệ thống.
