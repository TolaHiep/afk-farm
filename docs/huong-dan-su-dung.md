# Hướng dẫn sử dụng & vận hành — AKF

## 1. Kiến trúc tóm tắt
- **Frontend:** React (Vite) — giao diện admin (web) + tổ trưởng (mobile/PWA), là giao diện DUY NHẤT.
- **Backend:** ERPNext/Frappe v15 headless + custom app `akf_farm` (DocTypes, engine sinh việc, REST API).
- React gọi API tại `/api/method/akf_farm.api.*`; chạy same-origin (cùng cổng) nên dùng chung phiên đăng nhập.

## 2. Chạy hệ thống (một lệnh, một compose)

Toàn bộ stack (Frappe backend + MariaDB + Redis + scheduler/worker + frontend) nằm trong **một** `docker-compose.yml` ở gốc repo. Tạo `.env` từ `.env.example` trước.

### 2a. Chế độ DEV (live-edit, hot-reload) — mặc định
```
docker compose up -d --build      # tự gộp docker-compose.override.yml
docker compose down               # dừng
```
- Mở **http://localhost:${HTTP_PORT}** (mặc định `80`; `.env` hiện đặt `8080`).
- Backend chạy `bench serve` (auto-reload khi sửa `.py`); frontend chạy Vite (hot-reload khi sửa React); proxy `/api`,`/files`,`/assets` → backend.
- Site `akf.localhost` tự tạo + cài `akf_farm` + migrate lần đầu (volume bền).

### 2b. Chế độ PRODUCTION (không live-edit)
```
docker compose -f docker-compose.yml up -d --build   # bỏ qua override
```
nginx phục vụ React đã build + proxy API; cổng theo `HTTP_PORT`.

### 2c. Bật scheduler (BẮT BUỘC để sinh việc hằng ngày)
```
docker compose exec backend bash -lc 'bench --site akf.localhost enable-scheduler'
```
Scheduler chạy job hằng ngày: sinh việc cuốn chiếu + đánh dấu quá hạn. Nếu tắt, việc sẽ không tự cập nhật theo ngày.

## 3. Tài khoản
- **Admin (web):** đăng nhập bằng tên đăng nhập **`admin`** / mật khẩu **`admin`** (đăng nhập bằng username đã được bật; cũng có thể dùng email `Administrator`). Avatar + tên admin nằm ở chân sidebar — bấm để hiện nút **Đăng xuất**.
- **Tổ trưởng (mobile):** đăng nhập bằng **số điện thoại** (username) + mật khẩu. Tài khoản seed: `0901234567`, `0902345678` (mật khẩu `Akf@Farm2026`). Admin tạo tổ trưởng trong "Tổ & Tổ viên". Tổ trưởng tự đổi mật khẩu (≥ 6 ký tự) + cập nhật số điện thoại trong "Tài khoản".

> Toast: mọi thông báo lỗi/thành công/cảnh báo dùng toast nổi góc trên-phải (đã thay `window.alert`); thông báo bằng tiếng Việt, ưu tiên hiển thị message thật từ backend khi có lỗi API.

## 4. Nạp dữ liệu mẫu
```
docker compose exec backend bash -lc 'echo "import akf_farm.seed as s; s.run()" | bench --site akf.localhost console'
```
Tạo 2 vùng, 4 lô, 2 tổ trưởng, quy trình **Gấc + Sâm**, chu kỳ + sinh việc 10 ngày.

## 5. Luồng nghiệp vụ (admin)

1. **Vùng & Lô** (có 2 chế độ xem — toggle ở góc phải: **Danh sách** truyền thống và **Lưới** mỗi vùng = 1 thẻ kèm **mini-map ảnh vệ tinh** chia lô tô màu theo trạng thái; bấm lô trên mini-map hoặc chip dưới mỗi card → mở Bản đồ nhiệt zoom thẳng vào lô). Tạo vùng (vẽ ranh giới trên ảnh vệ tinh → tự tính diện tích). Tạo lô:
   - **Vẽ thủ công**: vẽ ranh giới lô trong vùng cha.
   - **Chia tự động**: chọn vùng + nhập **số lô** hoặc **diện tích/lô** → hệ thống cắt vùng thành các lô đều nhau (bisection), xem trước tự động rồi tạo hàng loạt; tên lô = tiền tố + STT (A1, A2…). Sửa một lô **không** ảnh hưởng các lô khác (mỗi lô là bản ghi độc lập).
   - Mỗi lô gắn **nhãn cây** (Gấc/Sâm hoặc cả hai) + tổ trưởng. "Loại cây" hiển thị theo cây đã gắn ngay cả khi lô **chưa có chu kỳ**.
   - **Chống chồng lấn trên bản đồ:** tạo *vùng* mới → các vùng đã có hiện **đỏ nét đứt**, chặn vẽ chồng; vẽ/sửa *lô* → các lô khác trong vùng hiện **xanh nét đứt**, chỉ **cảnh báo** nếu chồng (vẫn lưu được).
   - **Xoá vùng:** xoá luôn toàn bộ lô bên trong + dữ liệu phụ thuộc (việc, chu kỳ, báo cáo) — **không hoàn tác**; với dữ liệu thật nên cân nhắc.
2. **Quy trình:** nhập **thủ công từng bước**. Mỗi bước có: tên việc, **tần suất** (1 lần/chu kỳ · Hàng ngày · **N lần / N ngày**), công/ha, **phạm vi** (Theo cây / Dùng chung), **bắt đầu** (ngay / sau N ngày), **bước tiên quyết** (tùy chọn), yêu cầu ảnh, **Hướng dẫn (SOP)** — hiển thị cho tổ trưởng trên mobile khi làm việc đó. Quy trình có **Số ngày 1 chu kỳ**. Xem chi tiết & mẫu khai báo: [huong-dan-tao-quy-trinh.md](huong-dan-tao-quy-trinh.md).
   - (Nhập quy trình bằng file Excel đang tạm ẩn — nhập tay là cách chuẩn hiện tại.)
   - **Sửa quy trình** → hệ thống **tự sinh lại việc** cho mọi chu kỳ đang chạy dùng quy trình đó (giữ việc đã hoàn thành + quá khứ, làm lại từ hôm nay).
3. **Chu kỳ cây trồng:** mỗi lô gắn cây (Gấc/Sâm) + quy trình + ngày bắt đầu (mặc định = hôm nay). **Tạo chu kỳ là sinh việc ngay** cho cửa sổ 10 ngày; sau đó scheduler bù mỗi ngày.
   - Sinh việc **theo giai đoạn (event-driven)**: bước không tiên quyết bắt đầu từ ngày gieo + offset; bước có tiên quyết chỉ xuất hiện **sau khi** bước tiên quyết được tổ trưởng đánh dấu hoàn thành. Việc lặp dừng khi hết "Số ngày 1 chu kỳ".
   - "N lần/ngày" → mỗi ngày sinh nhiều việc "(lần 1/2)", "(lần 2/2)".
   - **Sửa chu kỳ** (đặc biệt **ngày bắt đầu**) → tự sinh lại việc theo lịch mới (giữ việc đã hoàn thành + quá khứ).
   - **Xoá chu kỳ:** chưa có việc hoàn thành → xoá hẳn (gỡ việc chưa xong); đã có việc hoàn thành → tự **đóng** chu kỳ (giữ lịch sử) + gỡ việc chưa xong.
4. **Lịch công việc / Bản đồ nhiệt:** theo dõi tiến độ; bản đồ tô màu theo trạng thái. Admin có thể **dời (lùi) từng việc** trong lịch. Bấm **ô ngày bất kỳ** (gồm ngày quá khứ) để xem việc + trạng thái từng việc của ngày đó. Vùng "Việc đã hoàn thành" → **Chi tiết** xem ảnh nghiệm thu kèm **cờ GPS** (Trong lô / Ngoài lô ~Xm / Thiếu GPS); bấm ảnh để **phóng to**.
5. **KPI tổ trưởng, Báo cáo, Yêu cầu hỗ trợ, Thông báo:** giám sát & phản hồi.
   - **Báo cáo tổ trưởng:** bấm "Xem" → tự đánh dấu **Đã xem**; modal có ô nhập phản hồi + nút "Gửi phản hồi" (chỉ lưu vào hệ thống, **không** gửi email).
   - **Yêu cầu hỗ trợ:** bấm Duyệt/Từ chối/Gửi phản hồi — chỉ lưu, **không** gửi email tự động.
   - **Thông báo (admin):** tabs lọc **Tất cả / Chưa đọc / Quá hạn / Bất thường** (đếm số), bấm thông báo → tự đánh dấu đã đọc + nhảy đến đúng việc/bất thường (việc quá hạn mở thẳng popup chi tiết trong Lịch).
6. **Cài đặt (Settings):** đổi **tên phần mềm + 2 phụ đề** (admin & mobile) + **tải ảnh logo lên** — logo và tên hiện ngay ở sidebar admin, topbar mobile và 2 trang đăng nhập (không cần reload). Cấu hình **email SMTP** (host/port/email/mật khẩu) + "Bật gửi email" + nút "Gửi email test"; nếu bật, hệ thống chạy job hằng ngày gửi email tổng hợp cho admin (việc quá hạn + bất thường mới — cũng có nút "Gửi thông báo tổng hợp" để gửi ngay). Email **chỉ** dùng cho tổng hợp hằng ngày; trả lời báo cáo/hỗ trợ không kèm email.

## 6. Luồng tổ trưởng (mobile)
Việc hôm nay → bấm việc → Hoàn thành → Báo cáo cuối ngày (số liệu + bất thường kèm ảnh thật). **Ảnh hoàn thành việc bắt buộc chụp trực tiếp bằng camera trong app** (chống gian lận): tự lấy GPS + giờ chụp + đốt watermark lên ảnh; server tự đối chiếu toạ độ với ranh giới lô và gắn cờ cho admin (ngoài lô / thiếu GPS). Báo cáo & hỗ trợ vẫn chụp/chọn ảnh thường. Ảnh tự nén chuẩn HD, tối đa 5 ảnh/lần. Offline: camera + GPS chạy không cần mạng, ảnh tạm lưu rồi tự đồng bộ khi có mạng (hoặc "Đồng bộ ngay"); báo cáo bất thường bắt buộc ≥1 ảnh. **Báo cáo cuối ngày không gửi được nếu để trống** (phải nhập số công/diện tích, hoặc bật Bất thường). Màn "Các ngày tới" cho **thu gọn/mở từng ngày** để dễ xem. Mỗi việc hiển thị **Hướng dẫn (SOP)** lấy từ bước quy trình (admin nhập ở Quản lý quy trình).

> Lưu ý camera: trình duyệt thật (Chrome/Safari) hoạt động đúng; **trình duyệt in-app của Zalo/Facebook chặn camera** — nếu mở link từ app chat, hãy chọn "Mở trong trình duyệt".

> Khi tổ trưởng hoàn thành một việc **tiên quyết** (vd "Xuống giống"), hệ thống tự mở khoá và sinh các việc phụ thuộc (vd tưới, chăm sóc) ngay.

## 7. Sao lưu / khôi phục (Frappe)
```
docker compose exec backend bash -lc 'bench --site akf.localhost backup'            # sao lưu DB + file
docker compose exec backend bash -lc 'bench --site akf.localhost restore <path>'    # khôi phục
```

## 8. Lệnh vận hành hay dùng
```
# Migrate sau khi sửa DocType
docker compose exec backend bash -lc 'bench --site akf.localhost migrate'
# Chạy test backend
docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm'
# Sinh việc thủ công (vd sau khi import quy trình/chu kỳ)
docker compose exec backend bash -lc 'bench --site akf.localhost execute akf_farm.engine.task_generator.generate_tasks'
# Log
docker compose logs -f backend | web-dev
```
