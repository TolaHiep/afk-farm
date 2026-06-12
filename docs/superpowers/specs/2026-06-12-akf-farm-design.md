# SPEC THIẾT KẾ HỆ THỐNG — PHẦN MỀM QUẢN LÝ SẢN XUẤT NÔNG TRẠI AKF

- **Ngày lập:** 12/06/2026
- **Trạng thái:** Đã brainstorm đủ 3 giai đoạn — chờ chủ đầu tư trả lời danh sách câu hỏi (Mục 10) trước khi bắt đầu code
- **Tài liệu gốc:** `AKF_v0__18-3-2026.md` (mô tả nhu cầu) và `AKF_Tai-lieu_IT-BA_v1.0.docx` (tài liệu IT-BA, 41 yêu cầu chức năng FR-01→FR-41, 12 yêu cầu phi chức năng)

## 1. Các quyết định đã chốt với chủ dự án

| # | Quyết định | Lựa chọn |
|---|---|---|
| 1 | Nền tảng | ERPNext v15 + Frappe Framework (mã nguồn mở), tùy biến qua custom app — KHÔNG sửa lõi |
| 2 | Ai xây dựng | Claude viết toàn bộ custom app + bộ cài Docker + tài liệu; chưa có vendor/đội IT |
| 3 | Môi trường chạy thử | Docker trên máy Windows hiện tại (đã có Docker 29.4, RAM 32GB, WSL2 Ubuntu 22.04); khi nghiệm thu xong mới đưa lên VPS thuê |
| 4 | Phạm vi bản đầu | MVP Giai đoạn 1 (đúng tài liệu BA); GĐ2, GĐ3 thiết kế sẵn trong spec này, làm sau |
| 5 | Tiến trình | Tạo thư mục dự án + spec trước; CHƯA code cho đến khi chủ đầu tư trả lời câu hỏi Mục 10 |

## 2. Kiến trúc tổng thể và công nghệ

```
┌────────────────────────── Máy chủ (Docker) ──────────────────────────┐
│  ERPNext v15 + Frappe Framework                                       │
│  ├── Custom app: akf_farm  (toàn bộ tùy biến nằm ở đây)               │
│  │     ├── DocTypes nông trại (zone, block, lệnh việc, nhật ký...)    │
│  │     ├── Trang mobile PWA /akf (tổ trưởng, giám sát)                │
│  │     ├── Print Format phiếu giao việc A4/A5                         │
│  │     ├── Dashboard + Report                                         │
│  │     └── Scheduled jobs (sinh việc, cảnh báo)                       │
│  ├── MariaDB (CSDL)   ├── Redis (cache/queue)   └── File storage (ảnh)│
└───────────────────────────────────────────────────────────────────────┘
        ▲ HTTPS                                ▲ HTTPS
┌───────────────┐                    ┌──────────────────────┐
│ Trình duyệt PC │                    │ Điện thoại Android    │
│ (giao diện     │                    │ PWA /akf — 5–7 nút,  │
│  ERPNext Desk) │                    │ offline queue, nén ảnh│
│ Văn phòng/kho  │                    │ Tổ trưởng, giám sát   │
└───────────────┘                    └──────────────────────┘
```

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Lõi | ERPNext v15, Frappe Framework v15, Python 3.11 | Bản LTS ổn định |
| CSDL | MariaDB 10.6 | Mặc định của ERPNext |
| Đóng gói | frappe_docker (docker compose chính thức) | Cài giống hệt nhau ở máy local và VPS |
| Custom app | `akf_farm` — Python (server) + JS (client) | Tách khỏi lõi, nâng cấp ERPNext an toàn |
| Giao diện văn phòng | ERPNext Desk, ngôn ngữ tiếng Việt | Trưởng SX, thủ kho, kế toán, GĐ, admin |
| Giao diện hiện trường | PWA tự viết, phục vụ tại `/akf` từ chính Frappe (HTML/JS thuần + Frappe REST API) | Tối giản 5–7 nút; KHÔNG bắt công nhân dùng Desk |
| Offline | IndexedDB lưu nháp nhật ký + ảnh khi mất sóng; service worker đồng bộ lại | Đáp ứng NFR-03 |
| Ảnh | Nén client-side (canvas, tối đa ~1280px, ~200–400KB), gắn timestamp + GPS từ trình duyệt | Đáp ứng FR-18, NFR-04, NFR-07 |
| In phiếu | Frappe Print Format (Jinja) → PDF A4/A5 | FR-14 |
| Báo cáo | Frappe Dashboard (Number Card + Chart) + Script Report; Power BI để mở sau (GĐ2+) | FR-31→FR-37 |

**Các phương án đã cân nhắc và loại:**
- Dùng ERPNext Desk cho cả công nhân hiện trường → loại: quá phức tạp, vi phạm yêu cầu "5–7 nút" (NFR-01).
- Viết frontend React/Flutter tách rời → loại ở GĐ1–2: tốn công bảo trì gấp đôi; PWA thuần đủ dùng. Có thể nâng cấp ở GĐ3 nếu cần app store.
- Dùng module Agriculture có sẵn của ERPNext → loại: module này đã bị gỡ khỏi bản v15 và quá sơ sài so với bài toán 2 tầng cây.

## 3. Mô hình dữ liệu (DocType) — toàn cảnh 3 giai đoạn

| DocType | Giai đoạn | Vai trò |
|---|---|---|
| Farm Zone | GĐ1 | 5 zone |
| Farm Block | GĐ1 | 25 block — hồ sơ điện tử đầy đủ |
| Work Team | GĐ1 | Tổ sản xuất + thành viên (child table) |
| Farm Task Template | GĐ1 | Thư viện đầu việc chuẩn: SOP, định mức công/vật tư, checklist (child table) |
| Farm Work Order | GĐ1 | Lệnh việc: block, việc, tổ, ngày, ưu tiên, trạng thái |
| Field Log | GĐ1 | Nhật ký thực địa: người làm, giờ, khối lượng, ảnh bắt buộc, GPS |
| Farm Incident | GĐ2 | Sự cố bất thường (úng/hạn/sâu bệnh/hỏng giàn) |
| Crop Cycle | GĐ2 | Chu kỳ cây trồng theo block (gấc/sâm song song), giai đoạn sinh trưởng |
| Crop Cycle Template | GĐ2 | Lịch mùa vụ mẫu → tự sinh Work Order theo mốc |
| Field Inspection | GĐ2 | Nghiệm thu QA: chấm checklist đạt/không đạt, duyệt/trả lại |
| Labor Attendance | GĐ2 | Chấm công gắn block (sinh từ Field Log, đối soát được) |
| (ERPNext Stock) Item, Warehouse, Stock Entry, Batch, Material Request | GĐ2 | Kho vật tư — dùng module có sẵn, thêm trường liên kết Farm Work Order |
| Harvest Batch | GĐ3 | Lô thu hoạch → QR truy xuất nguồn gốc |
| Sensor Reading, Weather Log | GĐ3 | Dữ liệu cảm biến/trạm thời tiết |
| (ERPNext Asset/Maintenance) | GĐ3 | Bảo trì giàn, tưới, máy móc |

Quan hệ cốt lõi: `Zone 1-n Block 1-n Work Order 1-n Field Log`; `Block 1-n Crop Cycle (tối đa 2 active: gấc + sâm)`; `Work Order n-1 Task Template`; `Stock Entry n-1 Work Order`.

## 4. GIAI ĐOẠN 1 — MVP (xây trước, nghiệm thu trên máy local)

### 4.1. Chức năng (bám FR của tài liệu BA)
1. **Cấu trúc vùng trồng** (FR-01→04): Farm Zone, Farm Block với đủ trường hồ sơ (diện tích, loại đất, độ dốc, nguồn nước, thoát nước, tình trạng giàn, mật độ gấc, mật độ sâm, ảnh sơ đồ, GPS). Danh sách block dạng lưới 5×5 có trạng thái.
2. **Thư viện đầu việc** (FR-10): Task Template + child table checklist + định mức. Nạp sẵn ~15 đầu việc mẫu của gấc và sâm (từ Mục 9 tài liệu nguồn).
3. **Lệnh việc** (FR-12, 13, 15): tạo thủ công/tạo hàng loạt theo zone; trạng thái Chưa làm → Đang làm → Chờ nghiệm thu → Hoàn thành / Trả lại; tự đánh dấu Quá hạn (scheduled job chạy hằng đêm).
4. **Phiếu in A4/A5** (FR-14): Print Format đúng mẫu Mục 8.4 tài liệu BA (mã phiếu, zone/block, việc, tổ, vật tư, checklist ô tích, chữ ký).
5. **PWA hiện trường** (FR-16, 17, 18, 20): màn hình Việc hôm nay → Chi tiết việc (nút Bắt đầu/Hoàn thành) → Ghi nhật ký (ảnh bắt buộc, chọn người, khối lượng, ghi chú) → Trạng thái đồng bộ. Offline queue bằng IndexedDB.
6. **Dashboard cơ bản** (FR-31, 35): % hoàn thành hôm nay, số việc quá hạn, số block có hoạt động, biểu đồ việc theo zone, danh sách việc trả lại/quá hạn.
7. **Phân quyền** (FR-38→41): 7 vai trò đúng ma trận Mục 4.2 tài liệu BA; giới hạn dữ liệu theo zone/tổ bằng User Permission; audit log dùng Version log có sẵn của Frappe.

### 4.2. Ngoài phạm vi GĐ1
Kho vật tư, chấm công, nghiệm thu checklist QA chi tiết (GĐ1 chỉ có duyệt/trả lại đơn giản của giám sát), lịch mùa vụ tự sinh việc, cảnh báo nâng cao.

### 4.3. Tiêu chí nghiệm thu GĐ1 (trên máy local)
- Chạy trọn chu trình: tạo lệnh việc → in phiếu PDF → đăng nhập tài khoản tổ trưởng trên điện thoại (cùng wifi) → ghi nhật ký + ảnh → giám sát duyệt → dashboard cập nhật.
- Tắt wifi điện thoại giữa chừng → nhật ký lưu nháp → bật lại → tự đồng bộ.
- Gửi nhật ký không có ảnh → hệ thống từ chối.
- Tài khoản tổ trưởng tổ A không thấy lệnh việc tổ B; giám sát zone 1 không duyệt được việc zone 2.

## 5. GIAI ĐOẠN 2 — Kho, chất lượng, chấm công, mùa vụ (sau khi GĐ1 chạy ổn 2–3 tháng)

1. **Kho vật tư** (FR-22→26): dùng module Stock có sẵn của ERPNext. Luồng: Material Request (tổ trưởng/trưởng SX tạo, gắn Work Order) → duyệt → Stock Entry xuất kho → Field Log ghi lượng dùng thực tế → Script Report đối chiếu xuất–dùng–định mức, thống kê hao hụt theo vật tư/tổ/block. Batch + hạn dùng cho thuốc BVTV; cảnh báo tồn dưới ngưỡng (Reorder level).
2. **Nghiệm thu QA** (FR-27→30): Field Inspection — giám sát mở checklist (kéo từ Task Template), chấm từng tiêu chí, kết luận đạt/không đạt; không đạt → Work Order về "Trả lại" kèm lý do; Field Log sau nghiệm thu chuyển trạng thái submitted (khóa, sửa phải amend có phê duyệt). KPI "đạt chuẩn ngay lần đầu".
3. **Chấm công** (FR-19): Labor Attendance sinh tự động từ Field Log (mỗi người tham gia 1 dòng công), trưởng SX duyệt; tổng hợp công theo người/tổ/block/zone/loại việc; xuất Excel cho kế toán tính lương (tính lương NGOÀI phạm vi).
4. **Chu kỳ mùa vụ** (FR-05→09): Crop Cycle cho từng block (1 block tối đa 2 cycle active: gấc + sâm, dữ liệu tách bạch); Crop Cycle Template định nghĩa chuỗi mốc (ví dụ gấc: làm đất → dựng giàn → trồng → bắt ngọn (+N ngày) → bón thúc... → thu hoạch đợt); scheduled job hằng đêm sinh Work Order nháp từ mốc đến hạn → trưởng SX duyệt thành kế hoạch ngày (FR-11). Sâm: tự tính tuổi củ, đủ 36 tháng → block chuyển "sẵn sàng thu củ" + cảnh báo (FR-08).
5. **Cảnh báo & báo cáo** (FR-32→34, 36): job hằng đêm quét việc quá hạn, block thiếu dữ liệu, tồn kho thấp → Notification trong hệ thống; báo cáo tuần/mùa vụ (Script Report): tiến độ zone/block, hiệu suất nhân công, tiêu hao vật tư, sản lượng, chi phí/ha, chi phí/kg (chi phí = công × đơn giá công + vật tư × đơn giá — đơn giá nhập ở danh mục). Bộ 14 KPI theo Mục 9 tài liệu BA.

**Tiêu chí nghiệm thu GĐ2:** chu trình vật tư khép kín ra được báo cáo hao hụt; 1 block chạy song song 2 cycle không lẫn số liệu; lệnh việc tự sinh đúng lịch template; checklist nghiệm thu chặn được việc không đạt.

## 6. GIAI ĐOẠN 3 — Mở rộng (chỉ làm khi GĐ2 ổn định và có ngân sách)

| Hạng mục | Cách làm dự kiến | Phụ thuộc |
|---|---|---|
| QR + truy xuất nguồn gốc | Harvest Batch gắn block/cycle/ngày thu/người thu; trang public `/trace/<id>` hiện hành trình lô hàng; in tem QR | Quy trình đóng gói thực tế; chuẩn truy xuất (VietGAP?) |
| Tích hợp cân điện tử | Nhận dữ liệu qua cổng RS232→PC bridge hoặc nhập file; ghi thẳng vào Harvest Batch | Model cân cụ thể |
| Bản đồ GIS | Leaflet + GeoJSON ranh giới 25 block, tô màu theo trạng thái/cảnh báo | Số liệu đo ranh giới GPS |
| Cảm biến ẩm đất / trạm thời tiết | MQTT hoặc REST ingestion → Sensor Reading; cảnh báo theo ngưỡng | Chọn thiết bị; sóng/điện tại trại |
| Camera | Chỉ liên kết xem (link RTSP/cloud của hãng), không lưu video trong ERPNext | Hệ camera đã có |
| Dự báo năng suất | Bắt đầu bằng thống kê hồi quy trên dữ liệu 2–3 vụ; chưa cam kết AI | Cần tối thiểu 2 vụ dữ liệu sạch |
| AI nhận diện lỗi qua ảnh | Gọi API mô hình thị giác (đánh giá khả thi sau khi có kho ảnh thật ≥ vài nghìn tấm đã gán nhãn đạt/không đạt) | Kho ảnh từ GĐ1–2 |
| Bảo trì giàn/tưới/máy móc | Module Asset + Maintenance Schedule có sẵn của ERPNext | Danh mục tài sản |
| Tài chính/chế biến/tiêu thụ | Bật module Accounting/Manufacturing/Selling của ERPNext; Cost Center theo zone/block | Quyết định của kế toán công ty |

## 7. Hạ tầng và vận hành

- **Phát triển + demo:** Docker trên máy Windows hiện tại (frappe_docker, site `akf.localhost`); điện thoại cùng wifi truy cập qua IP LAN.
- **Production (sau nghiệm thu GĐ1):** VPS 4 vCPU / 8GB RAM / 100GB SSD (~600 nghìn–1,2 triệu/tháng tùy nhà cung cấp VN hoặc quốc tế); cùng bộ docker compose; HTTPS qua Let's Encrypt; tên miền riêng.
- **Sao lưu:** `bench backup` tự động hằng đêm + đẩy bản sao ra ngoài server (object storage), giữ ≥30 bản (NFR-08).
- **Ảnh hiện trường:** lưu trong private files của site; ước tính 200 nhật ký/ngày × 2 ảnh × 300KB ≈ 3,6GB/tháng → dung lượng ổ VPS cần theo dõi, GĐ2 cân nhắc chuyển ảnh sang object storage (S3-compatible).
- **Tài khoản & bảo mật:** đăng nhập tài khoản cá nhân; mật khẩu chính sách tối thiểu; HTTPS bắt buộc; audit bằng Version log (NFR-06, 07).

## 8. Kiểm thử

- Unit test Python cho logic trạng thái Work Order, sinh việc từ template, tính tuổi củ.
- Kịch bản end-to-end thủ công cho từng tiêu chí nghiệm thu (Mục 4.3, 5).
- Dữ liệu mẫu: 5 zone, 25 block, 3 tổ, 7 tài khoản theo vai trò, 15+ đầu việc chuẩn, 2 cycle mẫu (gấc + sâm) — script `bench execute` nạp một lệnh.

## 9. Rủi ro kỹ thuật còn lại

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Không có người quản trị ERPNext lâu dài sau bàn giao | Cao | Tài liệu vận hành tiếng Việt + backup tự động + cân nhắc thuê dịch vụ managed khi lên production |
| Sóng 4G tại trại kém hơn dự kiến → offline queue dài, ảnh dồn | Trung bình | Nén ảnh mạnh, đồng bộ nền, phiếu giấy song song |
| Người dùng hiện trường không quen → bỏ app | Trung bình | PWA 5–7 nút, pilot 1 zone trước, đào tạo tại ruộng |
| Nâng cấp ERPNext phá tùy biến | Thấp | Mọi tùy biến trong app `akf_farm`, không patch lõi; ghim version v15 |

## 10. CÂU HỎI GỬI NHÀ ĐẦU TƯ (cần trả lời trước khi code)

### Nhóm A — BẮT BUỘC trả lời trước khi bắt đầu GĐ1
1. **Danh sách block thực tế:** 25 block đã có diện tích, ranh giới, tên gọi từng block chưa? (Xin bản vẽ/sơ đồ hoặc file Excel nếu có — để nạp dữ liệu thật thay vì dữ liệu mẫu.)
2. **Danh sách tổ sản xuất:** hiện có mấy tổ, mỗi tổ bao nhiêu người, tên tổ trưởng? Một tổ phụ trách cố định block nào hay điều động hằng ngày?
3. **Quy trình kỹ thuật (SOP):** tài liệu kỹ thuật trồng gấc và sâm đất của dự án (các bước, định mức công, định mức vật tư từng việc) đã có chưa? Ai là người chốt? — Đây là đầu vào cho thư viện đầu việc chuẩn.
4. **Điện thoại hiện trường:** tổ trưởng/giám sát đã có smartphone Android chưa? Nếu chưa, công ty có trang bị không (dự trù ~2–3 triệu/máy)?
5. **Sóng di động tại trại:** 4G ở khu 250ha tốt/chập chờn/mất hẳn ở vùng nào? (Quyết định mức độ đầu tư vào tính năng offline.)
6. **Cách tính công:** công nhật theo ngày, theo giờ, hay khoán theo khối lượng? (Quyết định thiết kế form nhật ký và chấm công.)
7. **Người vận hành phần mềm:** ai sẽ là admin nội bộ (tạo tài khoản, hỗ trợ người dùng) khi hệ thống chạy thật?

### Nhóm B — Cần trước khi đưa lên server thật (go-live GĐ1)
8. **Ngân sách hạ tầng:** duyệt chi phí thuê VPS (~600 nghìn–1,2 triệu/tháng) + tên miền (~300 nghìn/năm)? Ai đứng tên tài khoản?
9. **Mốc thời gian:** muốn dùng thật vào thời điểm nào? Có mốc mùa vụ bắt buộc phải kịp không (vụ trồng mới, đợt thu hoạch)?
10. **Phạm vi thí điểm:** đồng ý chạy thí điểm 1 zone (5 block) trong 2–4 tuần trước khi mở cả 25 block không?
11. **Dữ liệu cũ:** sổ sách/Excel về block, công, vật tư hiện có cần chuyển vào hệ thống, hay bắt đầu mới?

### Nhóm C — Cần trước GĐ2
12. **Kho:** có 1 kho trung tâm hay kho theo zone? Ai giữ sổ kho hiện nay? Danh mục vật tư khoảng bao nhiêu mặt hàng? Đã có định mức chưa?
13. **Đơn giá:** đơn giá ngày công và đơn giá vật tư lấy từ đâu, ai cập nhật? (Để tính chi phí/ha, chi phí/kg.)
14. **Cân sản lượng:** thu hoạch cân ở đâu (tại ruộng/kho/điểm tập kết)? Có cân điện tử chưa, hãng gì?

### Nhóm D — Cần trước GĐ3
15. **Truy xuất nguồn gốc:** dự án theo chuẩn nào (VietGAP, GlobalGAP, hữu cơ...)? Khách mua yêu cầu gì?
16. **Thiết bị IoT:** đã có/dự định mua camera, trạm thời tiết, cảm biến hãng nào chưa? Trại có điện lưới ổn định ở các zone không?
17. **Kế toán:** công ty đang dùng phần mềm kế toán gì? Có muốn nối số liệu chi phí sản xuất sang không?
