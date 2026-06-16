# AKF — Gộp deploy thành một Docker Compose + cấu trúc lại repo

- Ngày: 2026-06-16
- Trạng thái: Design (chờ duyệt)
- Liên quan: [[akf-backend-dev-env]], [[akf-two-docker-projects]], [[akf-backend-erpnext-headless]]

## 1. Bối cảnh & vấn đề

Hiện hệ thống chạy bằng **hai** docker compose project tách rời:

- `akf` — backend dev (frappe_docker, ngoài repo): 4 container `frappe/bench` + mariadb + 2 redis, `bench serve` cổng 8000 trên host. Dùng để live-edit.
- `akf-farm` — `docker-compose.yml` trong repo: 1 container `web` (nginx + React build) cổng 8080, proxy `/api`,`/files`,`/private` về host:8000 qua `host-gateway`.

Hệ quả: muốn chạy đủ phải bật hai nơi; không mang lên VPS bằng một lệnh được. Ngoài ra tên thư mục chưa rõ vai trò (`akf_farm/` = app backend, `web/` = frontend).

## 2. Mục tiêu

1. **Một** `docker-compose.yml` ở gốc repo, `docker compose up -d --build` là chạy đủ stack, phù hợp deploy VPS thật (cổng **80**).
2. Stack production chuẩn Frappe: gunicorn (không dùng dev server), scheduler + workers + websocket, MariaDB + Redis, volume bền, restart tự động, tự tạo site + cài app + migrate khi khởi động.
3. Repo self-contained: trên VPS chỉ cần `git clone` repo này là build được, **không** cần kéo thêm frappe_docker.
4. Cấu trúc thư mục đặt tên rõ `frontend/` và `backend/`.

### Non-goals

- Không cài ERPNext (vẫn Frappe-only, để dành GĐ2/3).
- Không đổi code Python của app, không đổi luồng dev hằng ngày (vẫn dùng frappe_docker devcontainer để live-edit).
- Không làm CI/CD, HTTPS/letsencrypt, hay multi-site (có thể bổ sung sau).

## 3. Cấu trúc thư mục mới

```
akf-farm/
├── backend/                    # đổi từ /akf_farm  (Frappe app)
│   └── akf_farm/               #   app root: pyproject.toml + package Python
│       └── akf_farm/           #   python package: hooks.py, engine/, api/, akf_farm/(doctype), events.py …
├── frontend/                   # đổi từ /web       (React SPA)
│   ├── src/  dist/  nginx.conf  Dockerfile  package.json  vite.config.ts …
├── deploy/                     # MỚI: hạ tầng production
│   ├── Containerfile           #   build image Frappe v15 + akf_farm
│   └── resources/              #   nginx-template.conf, nginx-entrypoint.sh, main-entrypoint.sh, start.sh
├── docs/
├── docker-compose.yml          # stack hợp nhất (thay file web-only cũ)
├── .env.example                # MỚI: biến cấu hình
└── README.md
```

Quy ước: tên `akf_farm` ở cấp app-root và package **phải giữ nguyên** (là tên app Frappe, dùng làm tên thư mục trong `apps/`). `backend/` chỉ là lớp bọc cho rõ vai trò. Di chuyển bằng `git mv` để giữ lịch sử.

App Frappe không phụ thuộc đường dẫn repo (import theo tên module `akf_farm.*`), nên dời thư mục **không** sửa code Python.

## 4. Image backend (`deploy/Containerfile`)

Phỏng theo `frappe_docker/images/custom/Containerfile` (đa tầng: base cài hệ thống + node + wkhtmltopdf → builder `bench init` → backend runtime). Khác biệt: **cài app `akf_farm` từ nguồn cục bộ** thay vì git URL, vì app nằm ở subdir của repo nên `apps.json` git-URL không dùng được.

Các bước chính của builder stage:

1. `bench init --frappe-branch=version-15 --frappe-path=https://github.com/frappe/frappe --no-procfile --no-backups --skip-redis-config-generation /home/frappe/frappe-bench`
2. `COPY backend/akf_farm /home/frappe/frappe-bench/apps/akf_farm` (nguồn cục bộ)
3. `bench setup requirements --python` cho akf_farm + thêm vào `sites/apps.txt`
4. `bench build --app akf_farm` (build assets nếu có)
5. Dọn `.git`, cache.

Runtime stage giống custom Containerfile: copy bench, tách assets sang image layer, entrypoint link assets vào volume `sites` lúc khởi động.

Pin version: **Frappe version-15** (khớp dev 15.111.1), Python theo base custom Containerfile, Node 24 (cho bench build). `INSTALL_CHROMIUM` tắt để image nhẹ (app không render PDF/chromium ở GĐ này).

Vendor vào `deploy/resources/` các file mà Containerfile cần (lấy từ `frappe_docker/resources/core/`): `nginx-template.conf`, `nginx-entrypoint.sh`, `main-entrypoint.sh`, `start.sh`, `security_headers.conf`. Mục đích: repo self-contained.

Build context = gốc repo (`.`), `dockerfile: deploy/Containerfile`, kèm `.dockerignore` để loại `node_modules`, `dist`, `.git`…

## 5. Service trong `docker-compose.yml`

Mọi service backend dùng **chung một image** build từ `deploy/Containerfile` (đặt `x-backend` anchor + `image: akf-farm-backend:latest`).

| Service | Lệnh / vai trò | Cổng | Ghi chú |
|---|---|---|---|
| `frontend` | nginx + React build (build từ `./frontend`) | **80:80** | public; reverse-proxy Frappe paths |
| `backend` | `gunicorn` qua `start.sh` | 8000 (nội bộ) | API Frappe |
| `websocket` | `node .../socketio.js` | 9000 (nội bộ) | realtime |
| `scheduler` | `bench schedule` | — | chạy `generate_tasks`, `mark_overdue` |
| `queue-short` | `bench worker --queue short,default` | — | |
| `queue-long` | `bench worker --queue long,default` | — | |
| `db` | `mariadb:11` | nội bộ | volume `db-data`, charset utf8mb4 |
| `redis-cache` | `redis:alpine` | nội bộ | |
| `redis-queue` | `redis:alpine` | nội bộ | |
| `configurator` | one-shot: set db/redis host vào `common_site_config.json` | — | `restart: "no"`, chạy trước rồi thoát |
| `create-site` | one-shot: tạo site + cài app + migrate | — | phụ thuộc configurator + db healthy |

`restart: unless-stopped` cho các service chạy dài; one-shot dùng `restart: "no"` và `depends_on` theo `condition: service_completed_successfully`.

Volume bền: `sites` (chia sẻ giữa backend/websocket/scheduler/queue/create-site/configurator), `db-data`, `logs`.

## 6. Mạng & nginx (React là UI duy nhất)

`frontend/nginx.conf` (sửa từ bản hiện tại):

- Đổi upstream `akf-backend:8000` (hack host-gateway) → service `backend:8000`.
- Giữ `proxy_set_header Host akf.localhost` để Frappe phân giải site (tách biệt với domain công khai).
- Giữ proxy `/api/`, `/files/`, `/private/`; **thêm** `/socket.io/` → `websocket:9000` (kèm header Upgrade/Connection cho websocket).
- Giữ SPA fallback `try_files … /index.html` và `/assets/` cache.
- `frontend` **không** mount volume `sites`: `/files`,`/private` phục vụ qua gunicorn (đơn giản, chấp nhận đánh đổi hiệu năng nhỏ ở GĐ này).
- Bỏ `extra_hosts: akf-backend:host-gateway`.

## 7. Dữ liệu, cấu hình & vòng đời

`.env.example` (giá trị mặc định cho dev/demo, đổi khi deploy thật):

```
SITE_NAME=akf.localhost
ADMIN_PASSWORD=admin
DB_ROOT_PASSWORD=123
DB_PASSWORD=akf-db-pass
FRAPPE_BRANCH=version-15
SEED_DEMO=0
HTTP_PORT=80
```

`create-site` (idempotent):

1. `wait-for-it` db + redis.
2. Nếu site `${SITE_NAME}` **chưa** tồn tại → `bench new-site ${SITE_NAME} --admin-password ${ADMIN_PASSWORD} --db-root-password ${DB_ROOT_PASSWORD} --install-app akf_farm --set-default`.
3. Luôn chạy `bench --site ${SITE_NAME} migrate` (áp DocType mới, ví dụ field `mandays`).
4. Nếu `SEED_DEMO=1` và site mới tạo → chạy seed (`akf_farm.seed.run` qua console).

`configurator` chạy trước `create-site` để ghi host db/redis vào `common_site_config.json`.

Frappe site name giữ `akf.localhost` (khớp dev, và nginx luôn gửi `Host: akf.localhost`), độc lập với domain VPS — domain công khai chỉ cần trỏ vào cổng 80.

## 8. Ảnh hưởng tới dev & việc cần cập nhật

- **Symlink bench**: trỏ lại `apps/akf_farm` → `…/akf-farm/backend/akf_farm` (việc một lần trong devcontainer).
- **Đường test**: `cd backend/akf_farm && python -m pytest` (engine thuần); lệnh `bench run-tests` không đổi.
- Cập nhật `README.md`, memory `akf-backend-dev-env` (đường dẫn app + lệnh test), và ghi chú compose mới thay cho `akf-two-docker-projects`.

## 9. Kiểm thử & nghiệm thu

1. Sau restructure (Phase 1): chạy lại engine unit test + `bench run-tests --app akf_farm` (qua devcontainer đã trỏ lại symlink) → tất cả pass như trước.
2. Sau compose (Phase 2), trên máy sạch (hoặc `docker compose down -v` rồi up):
   - `docker compose up -d --build` thành công, các service `Up`/one-shot `completed`.
   - `curl -H 'Host: <domain>' http://localhost/` trả index React.
   - `curl http://localhost/api/method/ping` (hoặc một custom API) trả JSON 200.
   - Đăng nhập/tạo dữ liệu qua UI hoạt động; ảnh upload vào `/files` xem lại được.
   - `docker compose restart` rồi dữ liệu vẫn còn (volume bền).
   - Field `mandays` xuất hiện (migrate đã chạy).

## 10. Rủi ro & giảm thiểu

- **Build image Frappe dễ vỡ** (apt deps, node, assets): giảm thiểu bằng cách bám sát Containerfile chính chủ đã kiểm chứng, chỉ thêm bước cài app cục bộ.
- **Restructure làm hỏng symlink/test**: tách Phase 1 riêng, chạy lại toàn bộ test ngay sau khi dời, trước khi đụng compose.
- **Quên domain/Host**: cố định `Host: akf.localhost` ở nginx nên domain VPS không ảnh hưởng phân giải site.
- **Mất dữ liệu khi thử**: chỉ dùng `down -v` trên môi trường test; tài liệu hoá cảnh báo.

## 11. Phạm vi triển khai (cho plan)

- Phase 1 — Restructure: `git mv` `akf_farm`→`backend/akf_farm`, `web`→`frontend`; trỏ lại symlink; cập nhật `.gitignore`/README/memory; chạy lại test.
- Phase 2 — Image: thêm `deploy/Containerfile` + `deploy/resources/*` + `.dockerignore`; build thử.
- Phase 3 — Compose: viết `docker-compose.yml` hợp nhất + `.env.example`; sửa `frontend/nginx.conf`; up thử end-to-end theo mục 9.
- Phase 4 — Tài liệu: cập nhật README/memory; xoá hack host-gateway cũ.
