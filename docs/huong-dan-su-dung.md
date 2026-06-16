# Hướng dẫn sử dụng & vận hành — AKF GĐ1

## 1. Kiến trúc tóm tắt
- **Frontend:** React (Vite) — giao diện admin (web) + tổ trưởng (mobile/PWA), là giao diện DUY NHẤT.
- **Backend:** ERPNext/Frappe v15 headless + custom app `akf_farm` (DocTypes, engine sinh việc, REST API).
- React gọi API tại `/api/method/akf_farm.api.*`; chạy same-origin (cùng cổng) nên dùng chung phiên đăng nhập.

## 2. Chạy hệ thống

### 2a. Chế độ DEMO (một cổng 8080)
Backend (Frappe dev stack) phải đang chạy và `bench serve` nghe ở cổng 8000 (xem 2b). Sau đó tại thư mục gốc dự án:
```
docker compose up -d --build      # build React + nginx, phục vụ ở http://localhost:8080
docker compose down               # dừng
```
Mở **http://localhost:8080**. nginx phục vụ React tĩnh và proxy `/api`,`/files` về backend (qua `akf-backend` → host:8000).

### 2b. Backend (Frappe) — stack dev `frappe_docker`
Đặt tại `C:\Users\SE-HiepNM\frappe_docker` (ngoài repo), project Docker tên `akf`. Lệnh dùng:
```
# Bật 4 container (frappe, mariadb, redis x2)
docker compose -p akf -f .devcontainer/docker-compose.yml up -d
# Vào container chạy web server (giữ chạy nền)
docker compose -p akf -f .devcontainer/docker-compose.yml exec frappe \
  bash -lc 'cd /workspace/development/frappe-bench && bench serve --port 8000'
```
Site: `akf.localhost` · Admin: `Administrator` / `admin`.

### 2c. Chế độ PHÁT TRIỂN (sửa code, hot-reload)
```
cd web && npm install && npm run dev      # http://localhost:5173 (proxy /api -> backend 8000)
```

## 3. Tài khoản
- **Admin (web):** đăng nhập bằng email, ví dụ `Administrator` / `admin`.
- **Tổ trưởng (mobile):** đăng nhập bằng **số điện thoại** (username) + mật khẩu. Tài khoản seed: `0901234567`, `0902345678` (mật khẩu `Akf@Farm2026`). Admin tạo tổ trưởng trong "Tổ & Tổ viên".

## 4. Nạp dữ liệu mẫu
Trong container Frappe:
```
echo "import akf_farm.seed as s; s.run()" | bench --site akf.localhost console
```
Tạo 2 vùng, 4 lô, 2 tổ trưởng, quy trình Gấc, chu kỳ + sinh việc 10 ngày.

## 5. Luồng nghiệp vụ (admin)
1. **Vùng & Lô:** tạo vùng (diện tích), lô (thuộc vùng, gán tổ trưởng).
2. **Quy trình:** nhập các bước canh tác (công/ha, tần suất, phạm vi theo cây / dùng chung).
3. **Chu kỳ cây trồng:** mỗi lô gắn cây (Gấc/Sâm) + quy trình + ngày bắt đầu → hệ thống tự sinh việc 10 ngày (job hằng đêm).
4. **Lịch công việc / Bản đồ nhiệt:** theo dõi tiến độ; bản đồ tô màu theo trạng thái (trộn màu theo tỷ lệ việc của 2 cây).
5. **KPI tổ trưởng, Báo cáo, Yêu cầu hỗ trợ, Thông báo:** giám sát & phản hồi.

## 6. Luồng tổ trưởng (mobile)
Việc hôm nay → bấm việc → Hoàn thành (đính ảnh nếu việc yêu cầu) → Báo cáo cuối ngày (số liệu + bất thường kèm ảnh). Xem lịch sử báo cáo, gửi yêu cầu hỗ trợ.

## 7. Sao lưu / khôi phục (Frappe)
```
bench --site akf.localhost backup            # sao lưu DB + file
bench --site akf.localhost restore <path>    # khôi phục
```
