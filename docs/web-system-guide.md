# Hệ Thống Quản Lý Sản Xuất Nông Trại

## Tổng Quan

Hệ thống quản lý sản xuất nông trại toàn diện với 2 phần:
- **Web Admin (1440px)**: Dành cho quản trị viên, 12 màn hình đầy đủ
- **Mobile PWA (390px)**: Dành cho tổ trưởng, 10 màn hình tối ưu cho ngoài trời

## Màu Sắc & Thiết Kế

### Tông màu chính:
- **Trắng/Xám**: Nền và các thành phần chính
- **Xanh lá (#16a34a)**: Điểm nhấn, nút chính
- **Trạng thái**:
  - 🟢 Xanh: Ổn định, hoàn thành
  - 🟡 Vàng: Cần chú ý, cảnh báo
  - 🔴 Đỏ: Quá hạn, bất thường

## Web Admin - Hướng Dẫn Sử Dụng

### 1. Đăng Nhập Admin (`/`)
- Email và mật khẩu
- Ghi nhớ đăng nhập
- Link chuyển sang Mobile

### 2. Dashboard (`/admin/dashboard`)
**KPI Cards:**
- % hoàn thành hôm nay
- Số việc quá hạn
- Số vùng cảnh báo (vàng/đỏ)
- Bất thường mới

**Biểu Đồ:**
- Công việc theo vùng (tổng vs hoàn thành)
- Danh sách "Cần chú ý"
- Bảng công việc hôm nay

### 3. Bản Đồ Nhiệt (`/admin/heatmap`)
**Tính Năng:**
- Bản đồ polygon với màu theo trạng thái
- Bộ lọc: ngày, vùng, cây
- Click lô mở panel chi tiết:
  - Tên lô, diện tích, tổ trưởng
  - Công việc hôm nay
  - Bất thường hiện tại
  - Nút "Xem lịch công việc"

### 4. Quản Lý Vùng & Lô (`/admin/zones`)
**Tính Năng:**
- Bảng dạng cây (tree table)
- Expand/collapse vùng
- Tìm kiếm và lọc
- Nút "Thêm vùng" và "Thêm lô"
- Cột **Loại cây** hiển thị cây đã gắn cho lô (kể cả khi lô chưa có chu kỳ)
- **Xóa vùng** = xóa luôn toàn bộ lô bên trong + dữ liệu phụ thuộc (việc/chu kỳ/báo cáo) — không hoàn tác

### 5. Form Thêm/Sửa Lô (`/admin/zones/add`)
**2 chế độ tạo lô:**
- **Vẽ thủ công:** vẽ polygon ranh giới lô trong vùng cha → tự tính diện tích.
- **Chia tự động:** chọn vùng cha + nhập **số lô** hoặc **diện tích/lô** → hệ thống cắt vùng thành các lô đều nhau (bisection), **xem trước tự động** trên bản đồ rồi tạo hàng loạt; tên lô = tiền tố + STT (A1, A2…). Khi chia theo diện tích có phần dư → chọn "giữ lô nhỏ" hoặc "chia đều".

**Thông Tin:**
- Tên lô/vùng
- Vùng cha (cho lô)
- Diện tích (tự động từ bản đồ)
- Tổ trưởng
- **Nhãn cây** (Gấc / Sâm — tích được cả hai)

**Chống chồng lấn trên bản đồ:**
- Tạo **vùng** mới → các vùng đã có hiện **đỏ nét đứt**, **chặn** vẽ điểm chồng lên.
- Vẽ/sửa **lô** → các lô khác trong vùng hiện **xanh nét đứt**, chỉ **cảnh báo** nếu chồng (vẫn lưu được). Sửa một lô **không** ảnh hưởng các lô khác (kể cả lô chia tự động).

### 6. Quản Lý Tổ & Tổ Viên (`/admin/teams`)
**2 Tab:**
- **Tổ trưởng**: Họ tên, SĐT, lô phụ trách
- **Tổ viên**: Họ tên, SĐT, tổ trưởng quản lý

**Thao tác:**
- Thêm, sửa, xóa
- Tìm kiếm

### 7. Quản Lý Quy Trình (`/admin/processes`)
**Danh Sách:**
- Quy trình Gấc
- Quy trình Sâm

**Cấp quy trình:** Tên, Cây, **Số ngày 1 chu kỳ**.

**Bảng Bước (nhập tay):**
- STT, Mô tả, Công/ha
- **Tần suất:** 1 lần/chu kỳ · Hàng ngày · **N lần / N ngày** (Số lần X + Mỗi Y ngày)
- Phạm vi (Theo cây / Dùng chung), Yêu cầu ảnh
- **Bắt đầu:** Ngay / Sau N ngày
- **Bước tiên quyết** (tùy chọn): bước phải hoàn thành trước
- **Hướng dẫn (SOP):** nhập hướng dẫn cho từng bước → tổ trưởng xem trên mobile khi làm việc đó
- (Nhập từ Excel: tạm ẩn)

Chi tiết khai báo + mẫu: `docs/huong-dan-tao-quy-trinh.md`.

**Sửa quy trình → tự sinh lại việc** cho các chu kỳ đang chạy dùng quy trình đó (giữ việc đã hoàn thành + quá khứ, làm lại từ hôm nay).

### 8. Quản Lý Chu Kỳ Cây Trồng (`/admin/crop-cycles`)
**Thông Tin:**
- Lô, cây trồng, ngày bắt đầu (mặc định hôm nay)
- Quy trình áp dụng
- Tiến độ (progress bar)
- Một lô có thể có nhiều cây (xen canh Gấc + Sâm)

**Sinh việc (event-driven):**
- Tạo chu kỳ → sinh việc ngay (cửa sổ 10 ngày); scheduler bù mỗi ngày.
- Bước có **tiên quyết** chỉ sinh sau khi bước đó được đánh dấu hoàn thành (neo từ ngày hoàn thành + offset); bước không tiên quyết neo từ ngày gieo + offset. Việc lặp dừng khi hết "Số ngày 1 chu kỳ".
- **Sửa chu kỳ** (ngày bắt đầu / quy trình) → tự **sinh lại việc** theo lịch mới (giữ việc đã hoàn thành + quá khứ).
- **Xoá chu kỳ:** chưa có việc hoàn thành → xoá hẳn; đã có → tự đóng (giữ lịch sử), gỡ việc chưa xong.

### 9. Lịch Công Việc 10 Ngày (`/admin/calendar`)
**Tính Năng:**
- Lịch dạng cột (10 ngày)
- Bộ lọc: vùng, lô, tổ trưởng, cây
- Thẻ việc theo ngày
- Mỗi việc có nút **Cập nhật** mở popup: đổi ngày và/hoặc đổi tổ trưởng rồi bấm **Cập nhật** (gộp chung, lưu một lần)
- Bấm **ô ngày bất kỳ** trên lịch (gồm **ngày quá khứ**) → xem việc + trạng thái từng việc của ngày đó
- Vùng **Việc đã hoàn thành** (dưới lịch) → nút **Chi tiết** xem ảnh nghiệm thu kèm **cờ GPS**: 🟢 Trong lô / 🔴 Ngoài lô (~Xm) / 🟡 Thiếu GPS, và nhãn *Không chụp in-app*; mỗi ảnh có toạ độ (mở Google Maps) + giờ chụp; **bấm ảnh để phóng to** (lightbox)

### 10. KPI Tổ Trưởng (`/admin/kpi`)
**Bộ Lọc:**
- Tổ trưởng, vùng, thời gian

**Chỉ Số:**
- Đúng hạn, quá hạn, hoàn thành
- Báo cáo đầy đủ
- Bất thường, tổng công
- Biểu đồ so sánh
- Bảng chi tiết

### 11. Thông Báo / Cảnh Báo (`/admin/notifications`)
**Danh Sách:**
- Việc quá hạn
- Bất thường mới
- Chưa gửi báo cáo

**Filter Tabs:**
- Tất cả, Chưa đọc, Quá hạn, Bất thường

**Email (thay push):** khi bật email trong Cài đặt, hệ thống gửi **email tổng hợp hằng ngày** cho admin (việc quá hạn + bất thường mới); trả lời yêu cầu hỗ trợ → gửi email cho tổ trưởng. (Web-push không dùng vì trình duyệt in-app Zalo/FB chặn + iOS hạn chế.)

### 11b. Cài Đặt (`/admin/settings`)
- Tab **Phần mềm**: tên, công ty, liên hệ, **tải logo lên** (ảnh).
- Tab **Email (SMTP)**: host/port/email gửi/tên/**mật khẩu** + "Bật gửi email"; nút **Gửi email test** và **Gửi thông báo tổng hợp** (gửi ngay bản tổng hợp quá hạn + bất thường).

### 12. Chi Tiết Bất Thường (`/admin/anomaly/:id`)
**Thông Tin:**
- Loại: úng nước, hạn, sâu bệnh, hỏng giàn, khác
- Lô, cây, người báo cáo
- Ảnh, ghi chú
- Trạng thái xử lý
- Lịch sử xử lý

**Thao Tác:**
- Gán kỹ thuật viên
- Thêm ghi chú
- Tạo công việc khắc phục
- Đánh dấu đã xử lý

## Mobile PWA - Hướng Dẫn Sử Dụng

### 1. Đăng Nhập (`/mobile/login`)
- Tài khoản, mật khẩu
- Nhớ đăng nhập
- Nút lớn, dễ chạm

### 2. Việc Hôm Nay (`/mobile/tasks`)
**Danh Sách Thẻ:**
- Tên việc, lô, cây
- Trạng thái: Chưa làm, Đang làm, Xong, Quá hạn
- Icon màu theo trạng thái

**Nút:**
- "Các ngày tới"
- "Báo cáo cuối ngày"

### 3. Các Ngày Tới (`/mobile/upcoming`)
**Hiển Thị:**
- Danh sách theo ngày
- Header ngày với số lượng việc — **bấm để thu gọn/mở** từng ngày (dễ xem các ngày sau)
- Thẻ việc đơn giản

> Camera (mục 4 & 5): trình duyệt thật (Chrome/Safari) chạy đúng; **trình duyệt in-app Zalo/Facebook chặn camera** → mở link bằng trình duyệt thật.

### 4. Chi Tiết Việc (`/mobile/task/:id`)
**Thông Tin:**
- Lô, cây, ngày
- SOP (hướng dẫn) — lấy từ bước quy trình admin nhập; chỉ hiện khi bước đó có SOP

**Nút Lớn:**
- "Hoàn thành" (bấm trực tiếp, không cần bước "Bắt đầu")
- "Chụp ảnh" (chống gian lận): mở **camera trong app** chụp trực tiếp tại lô (không chọn ảnh thư viện), tự lấy **GPS + giờ chụp** và đốt **watermark** (giờ · GPS · tên lô) lên ảnh; tối đa 5 ảnh, nén chuẩn HD. Việc bắt buộc ảnh mà thiết bị không cấp quyền/không hỗ trợ camera thì **không hoàn thành được**. Thiếu GPS vẫn cho hoàn thành (gắn cờ cho admin).

### 5. Xác Nhận Hoàn Thành
**Popup:**
- Xác nhận hoàn thành
- Kiểm tra ảnh (nếu cần)
- Báo lỗi đỏ nếu thiếu ảnh

### 6. Báo Cáo Cuối Ngày (`/mobile/report`)
**Form:**
- Số liệu sản xuất (số công, diện tích)
- Ghi chú
- **Không gửi được nếu để trống** — phải nhập số công hoặc diện tích (hoặc bật Bất thường)

**Bất Thường:**
- Toggle có/không
- Nếu có:
  - Chọn loại: úng, hạn, sâu bệnh, hỏng giàn, khác
  - Ghi chú
  - **Chụp ảnh bắt buộc** (tối thiểu 1 ảnh): chụp hoặc chọn ảnh thật từ máy (tối đa 5), tự nén chuẩn HD, lưu kèm bản ghi

### 7. Gửi Thành Công (`/mobile/success`)
- Icon check lớn
- Thông báo đã gửi
- Tóm tắt báo cáo
- Nút "Về trang chủ"

### 8. Đồng Bộ Offline (`/mobile/offline`)
**Banner Mất Mạng:**
- "Đang lưu tạm, sẽ tự gửi khi có mạng"

**Danh Sách:**
- Mục chưa gửi
- Trạng thái đồng bộ
- Nút "Đồng bộ ngay"

### 9. Thông Báo Mobile (`/mobile/notifications`)
**Loại:**
- Việc mới
- Việc bị lùi lịch
- Việc được gán lại
- Báo cáo gửi thành công

## Prototype Flow

### Admin Flow:
```
Login → Dashboard → Bản đồ nhiệt → Chi tiết lô → Lịch 10 ngày → Popup việc
```

### Admin Thiết Lập:
```
Vùng/lô → Tổ → Quy trình → Chu kỳ cây → Sinh việc tự động
```

### Tổ Trưởng Flow:
```
Login → Việc hôm nay → Chi tiết việc → Hoàn thành → Báo cáo cuối ngày → Gửi
```

### Offline Flow:
```
Mất mạng → Lưu tạm → Có mạng → Đồng bộ tự động/thủ công
```

## Component Library

### UI Components:
- `StatusBadge`: Badge trạng thái với màu
- `KPICard`: Thẻ KPI với icon và số liệu
- `Button`: Nút với variant (primary, secondary, danger, ghost)

### Layout Components:
- `AdminLayout`: Sidebar + Topbar cho admin
- `MobileLayout`: Bottom navigation cho mobile

### Màn Hình:
- **Admin**: 12 màn hình đầy đủ
- **Mobile**: 10 màn hình tối ưu

## Dữ Liệu Mẫu

File `/src/app/lib/mockData.ts` chứa:
- Vùng (zones)
- Lô (plots)
- Tổ trưởng & tổ viên (teamLeaders, teamMembers)
- Quy trình (processes)
- Chu kỳ cây trồng (cropCycles)
- Công việc (tasks)
- Bất thường (anomalies)
- Thông báo (notifications)
- KPI data

## Công Nghệ

- **React 18.3.1**
- **React Router 7** (Data mode)
- **Tailwind CSS v4**
- **Recharts** (biểu đồ)
- **Lucide React** (icons)
- **TypeScript** (type safety)

## Lưu Ý Quan Trọng

1. **Responsive**: Desktop 1440px, Mobile 390px
2. **Màu Trạng Thái**: Xanh/Vàng/Đỏ nhất quán
3. **Mobile**: Chữ lớn, nút to, tối đa 5-7 nút/màn
4. **Offline**: Lưu tạm, tự động đồng bộ
5. **Ảnh Bắt Buộc**: Validation cho báo cáo bất thường

## URL Routes

### Admin:
- `/` - Login
- `/admin/dashboard` - Dashboard
- `/admin/heatmap` - Bản đồ nhiệt
- `/admin/zones` - Quản lý vùng/lô
- `/admin/zones/add` - Thêm vùng/lô
- `/admin/teams` - Quản lý tổ
- `/admin/processes` - Quy trình
- `/admin/crop-cycles` - Chu kỳ cây
- `/admin/calendar` - Lịch 10 ngày
- `/admin/kpi` - KPI tổ trưởng
- `/admin/notifications` - Thông báo
- `/admin/anomaly/:id` - Chi tiết bất thường

### Mobile:
- `/mobile/login` - Login mobile
- `/mobile/tasks` - Việc hôm nay
- `/mobile/upcoming` - Các ngày tới
- `/mobile/task/:id` - Chi tiết việc
- `/mobile/report` - Báo cáo cuối ngày
- `/mobile/success` - Gửi thành công
- `/mobile/offline` - Đồng bộ offline
- `/mobile/notifications` - Thông báo mobile
