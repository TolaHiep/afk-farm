# AKF — Gộp deploy thành một Docker Compose + cấu trúc lại repo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một `docker-compose.yml` duy nhất ở gốc repo chạy đủ stack Frappe v15 + app `akf_farm` + frontend React trên cổng 80, deploy được lên VPS bằng một lệnh; đồng thời đổi tên thư mục rõ `frontend/` và `backend/`.

**Architecture:** Build một image backend tùy biến (`deploy/Containerfile`, phỏng theo `frappe_docker/images/custom/Containerfile`) cài Frappe v15 + copy app `akf_farm` cục bộ. Compose chạy bộ service production chuẩn (backend gunicorn, websocket, scheduler, 2 queue worker, db MariaDB, 2 redis, 2 job one-shot configurator + create-site) dùng chung image đó; service `frontend` là nginx + React build (cổng 80) reverse-proxy các path Frappe về `backend`/`websocket`.

**Tech Stack:** Docker Compose, Frappe v15, MariaDB 11.8, Redis alpine, Nginx, React (Vite build, Node 20).

**Spec:** `docs/superpowers/specs/2026-06-16-akf-deploy-single-compose-design.md`

**Lưu ý môi trường:** Lệnh shell viết cho **Git Bash** trên Windows, chạy ở gốc repo `C:\Users\SE-HiepNM\akf-farm`. Devcontainer dev là frappe_docker project `akf` (xem memory `akf-backend-dev-env`).

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `backend/akf_farm/**` | App Frappe (di chuyển từ `akf_farm/`), không sửa nội dung |
| `frontend/**` | React SPA (di chuyển từ `web/`) |
| `frontend/nginx.conf` | Reverse-proxy: upstream `backend:8000`, thêm `/socket.io` |
| `deploy/Containerfile` | Build image Frappe v15 + akf_farm từ nguồn cục bộ |
| `deploy/resources/core/**` | 5 file resource vendor từ frappe_docker (nginx + entrypoint) |
| `.dockerignore` (gốc) | Giảm build context cho image backend |
| `docker-compose.yml` (gốc) | Stack hợp nhất (thay file web-only cũ) |
| `.env.example` | Biến cấu hình mặc định |
| `README.md` | Hướng dẫn deploy mới |

---

## Phase 1 — Cấu trúc lại thư mục (frontend/backend)

### Task 1: Di chuyển thư mục bằng git mv

**Files:**
- Move: `akf_farm/` → `backend/akf_farm/`
- Move: `web/` → `frontend/`

- [ ] **Step 1: Tạo thư mục backend và di chuyển app**

Run:
```bash
cd /c/Users/SE-HiepNM/akf-farm
mkdir -p backend
git mv akf_farm backend/akf_farm
git mv web frontend
```

- [ ] **Step 2: Kiểm tra cấu trúc**

Run: `ls backend/akf_farm && ls frontend`
Expected: `backend/akf_farm` chứa `pyproject.toml` + thư mục `akf_farm`; `frontend` chứa `package.json`, `nginx.conf`, `Dockerfile`, `src`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: doi ten thu muc akf_farm->backend/akf_farm, web->frontend"
```

### Task 2: Trỏ lại symlink bench trong devcontainer & chạy lại test

**Files:** không sửa file repo; thao tác trong container `akf-frappe-1`.

- [ ] **Step 1: Đảm bảo container dev đang chạy**

Run:
```bash
docker compose -p akf -f /c/Users/SE-HiepNM/frappe_docker/.devcontainer/docker-compose.yml up -d
```
Expected: 4 container `akf-*` Started/Up.

- [ ] **Step 2: Xem target symlink hiện tại của app**

Run:
```bash
docker compose -p akf -f /c/Users/SE-HiepNM/frappe_docker/.devcontainer/docker-compose.yml exec -T frappe bash -lc 'cd /workspace/development/frappe-bench/apps && ls -la akf_farm'
```
Expected: in ra dòng symlink `akf_farm -> <đường-dẫn-cũ>` (trỏ tới `.../akf-farm/akf_farm`).

- [ ] **Step 3: Trỏ lại symlink sang đường dẫn mới**

Lấy `<đường-dẫn-cũ>` ở Step 2, thay hậu tố `/akf_farm` thành `/backend/akf_farm`. Ví dụ nếu cũ là `/workspace/development/akf-farm/akf_farm` thì mới là `/workspace/development/akf-farm/backend/akf_farm`.

Run (thay `<NEW_PATH>`):
```bash
docker compose -p akf -f /c/Users/SE-HiepNM/frappe_docker/.devcontainer/docker-compose.yml exec -T frappe bash -lc 'cd /workspace/development/frappe-bench/apps && rm akf_farm && ln -s <NEW_PATH> akf_farm && ls -la akf_farm && test -f akf_farm/pyproject.toml && echo OK'
```
Expected: symlink mới + `OK` (xác nhận trỏ đúng app root).

- [ ] **Step 4: Chạy lại engine unit test (thuần, trên host)**

Run:
```bash
cd /c/Users/SE-HiepNM/akf-farm/backend/akf_farm && python -m pytest -q
```
Expected: `3 passed` (workload balancer).

- [ ] **Step 5: Chạy lại test Frappe**

Run:
```bash
docker compose -p akf -f /c/Users/SE-HiepNM/frappe_docker/.devcontainer/docker-compose.yml exec -T frappe bash -lc 'cd /workspace/development/frappe-bench && bench --site akf.localhost run-tests --app akf_farm --module akf_farm.akf_farm.tests.test_assignment 2>&1 | tail -8'
```
Expected: `Ran 3 tests ... OK`.

- [ ] **Step 6: Cập nhật memory dev-env (đường dẫn + lệnh test)**

Sửa `C:\Users\SE-HiepNM\.claude\projects\C--Users-SE-HiepNM-akf-farm\memory\akf-backend-dev-env.md`: đổi mọi `akf-farm\akf_farm` → `akf-farm\backend\akf_farm`; đổi lệnh test thuần thành `cd C:\Users\SE-HiepNM\akf-farm\backend\akf_farm && python -m pytest`; ghi chú symlink trỏ `backend/akf_farm`.

(Không commit vào repo — file memory nằm ngoài repo.)

---

## Phase 2 — Image backend (`deploy/Containerfile`)

### Task 3: Vendor file resources từ frappe_docker

**Files:**
- Create: `deploy/resources/core/main-entrypoint.sh`
- Create: `deploy/resources/core/start.sh`
- Create: `deploy/resources/core/nginx/nginx-entrypoint.sh`
- Create: `deploy/resources/core/nginx/nginx-template.conf`
- Create: `deploy/resources/core/nginx/security_headers.conf`

- [ ] **Step 1: Copy 5 file từ frappe_docker cục bộ**

Run:
```bash
cd /c/Users/SE-HiepNM/akf-farm
mkdir -p deploy/resources/core/nginx
cp /c/Users/SE-HiepNM/frappe_docker/resources/core/main-entrypoint.sh deploy/resources/core/main-entrypoint.sh
cp /c/Users/SE-HiepNM/frappe_docker/resources/core/start.sh           deploy/resources/core/start.sh
cp /c/Users/SE-HiepNM/frappe_docker/resources/core/nginx/nginx-entrypoint.sh   deploy/resources/core/nginx/nginx-entrypoint.sh
cp /c/Users/SE-HiepNM/frappe_docker/resources/core/nginx/nginx-template.conf   deploy/resources/core/nginx/nginx-template.conf
cp /c/Users/SE-HiepNM/frappe_docker/resources/core/nginx/security_headers.conf deploy/resources/core/nginx/security_headers.conf
```

- [ ] **Step 2: Xác nhận đủ 5 file**

Run: `find deploy/resources -type f | sort`
Expected: liệt kê đúng 5 đường dẫn trên.

- [ ] **Step 3: Commit**

```bash
git add deploy/resources
git commit -m "deploy: vendor frappe_docker core resources (nginx + entrypoint)"
```

### Task 4: Viết `deploy/Containerfile` + `.dockerignore`

**Files:**
- Create: `deploy/Containerfile`
- Create: `.dockerignore` (gốc repo)

- [ ] **Step 1: Tạo `.dockerignore` ở gốc repo**

Create `/c/Users/SE-HiepNM/akf-farm/.dockerignore`:
```
.git
.playwright-mcp
docs
frontend/node_modules
frontend/dist
backend/akf_farm/.pytest_cache
**/__pycache__
**/*.pyc
```

- [ ] **Step 2: Tạo `deploy/Containerfile`**

Create `/c/Users/SE-HiepNM/akf-farm/deploy/Containerfile` (build context = gốc repo; copy app từ `backend/akf_farm`):
```dockerfile
# Build image Frappe v15 + app akf_farm (nguon cuc bo). Phong theo
# frappe_docker/images/custom/Containerfile, them buoc cai app local.
ARG PYTHON_VERSION=3.11.9
ARG DEBIAN_BASE=bookworm
FROM python:${PYTHON_VERSION}-slim-${DEBIAN_BASE} AS base

COPY deploy/resources/core/nginx/nginx-template.conf /templates/nginx/frappe.conf.template
COPY deploy/resources/core/nginx/nginx-entrypoint.sh /usr/local/bin/nginx-entrypoint.sh
COPY deploy/resources/core/nginx/security_headers.conf /etc/nginx/snippets/security_headers.conf

ARG WKHTMLTOPDF_VERSION=0.12.6.1-3
ARG WKHTMLTOPDF_DISTRO=bookworm
ARG NODE_VERSION=20.19.2
ENV NVM_DIR=/home/frappe/.nvm
ENV PATH=${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/:${PATH}

RUN useradd -ms /bin/bash frappe \
    && apt-get update \
    && apt-get install --no-install-recommends -y \
    curl git vim nginx gettext-base file \
    libpango-1.0-0 libharfbuzz0b libpangoft2-1.0-0 libpangocairo-1.0-0 \
    restic gpg mariadb-client less libpq-dev postgresql-client \
    wait-for-it jq media-types \
    && mkdir -p ${NVM_DIR} \
    && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash \
    && . ${NVM_DIR}/nvm.sh \
    && nvm install ${NODE_VERSION} \
    && nvm use v${NODE_VERSION} \
    && npm install -g yarn \
    && nvm alias default v${NODE_VERSION} \
    && rm -rf ${NVM_DIR}/.cache \
    && echo 'export NVM_DIR="/home/frappe/.nvm"' >>/home/frappe/.bashrc \
    && echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >>/home/frappe/.bashrc \
    && if [ "$(uname -m)" = "aarch64" ]; then export ARCH=arm64; fi \
    && if [ "$(uname -m)" = "x86_64" ]; then export ARCH=amd64; fi \
    && downloaded_file=wkhtmltox_${WKHTMLTOPDF_VERSION}.${WKHTMLTOPDF_DISTRO}_${ARCH}.deb \
    && curl -sLO https://github.com/wkhtmltopdf/packaging/releases/download/$WKHTMLTOPDF_VERSION/$downloaded_file \
    && apt-get install -y ./$downloaded_file \
    && rm $downloaded_file \
    && rm -rf /var/lib/apt/lists/* \
    && rm -fr /etc/nginx/sites-enabled/default \
    && pip3 install frappe-bench \
    && sed -i '/user www-data/d' /etc/nginx/nginx.conf \
    && ln -sf /dev/stdout /var/log/nginx/access.log && ln -sf /dev/stderr /var/log/nginx/error.log \
    && touch /run/nginx.pid \
    && chown -R frappe:frappe /etc/nginx/conf.d /etc/nginx/nginx.conf /etc/nginx/snippets /var/log/nginx /var/lib/nginx /run/nginx.pid \
    && chmod 755 /usr/local/bin/nginx-entrypoint.sh

FROM base AS builder

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
    wget libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    libpq-dev libffi-dev liblcms2-dev libldap2-dev libmariadb-dev libsasl2-dev \
    libtiff5-dev libwebp-dev pkg-config redis-tools rlwrap tk8.6-dev cron \
    gcc build-essential libbz2-dev \
    && rm -rf /var/lib/apt/lists/*

USER frappe

ARG FRAPPE_BRANCH=version-15
ARG FRAPPE_PATH=https://github.com/frappe/frappe

# 1) Khoi tao bench chi voi frappe
RUN bench init \
    --frappe-branch=${FRAPPE_BRANCH} \
    --frappe-path=${FRAPPE_PATH} \
    --no-procfile --no-backups --skip-redis-config-generation --verbose \
    /home/frappe/frappe-bench \
  && cd /home/frappe/frappe-bench \
  && echo "{}" > sites/common_site_config.json

# 2) Cai app akf_farm tu nguon cuc bo (copy vao apps roi them vao moi truong)
COPY --chown=frappe:frappe backend/akf_farm /home/frappe/frappe-bench/apps/akf_farm
RUN cd /home/frappe/frappe-bench \
  && ./env/bin/pip install -e apps/akf_farm \
  && echo "akf_farm" >> sites/apps.txt \
  && bench build --app akf_farm \
  && find apps -mindepth 1 -path "*/.git" | xargs rm -fr || true

FROM base AS backend

USER frappe
COPY --from=builder --chown=frappe:frappe /home/frappe/frappe-bench /home/frappe/frappe-bench
WORKDIR /home/frappe/frappe-bench

RUN cp -r /home/frappe/frappe-bench/sites/assets /home/frappe/frappe-bench/assets \
  && rm -rf /home/frappe/frappe-bench/sites/assets

VOLUME [ "/home/frappe/frappe-bench/sites", "/home/frappe/frappe-bench/logs" ]

USER root
COPY deploy/resources/core/main-entrypoint.sh /usr/local/bin/entrypoint.sh
COPY deploy/resources/core/start.sh /usr/local/bin/start.sh
RUN chmod 755 /usr/local/bin/entrypoint.sh /usr/local/bin/start.sh

USER frappe
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["start.sh"]
```

- [ ] **Step 3: Build thử image**

Run:
```bash
cd /c/Users/SE-HiepNM/akf-farm
docker build -f deploy/Containerfile -t akf-farm-backend:latest . 2>&1 | tail -25
```
Expected: build kết thúc `naming to docker.io/library/akf-farm-backend:latest` / `FINISHED`, không lỗi.

- [ ] **Step 4: Smoke test image (frappe + akf_farm có mặt)**

Run:
```bash
docker run --rm akf-farm-backend:latest bash -lc 'cat sites/apps.txt && ls apps'
```
Expected: `apps.txt` chứa `frappe` và `akf_farm`; thư mục `apps` có cả hai.

- [ ] **Step 5: Commit**

```bash
git add deploy/Containerfile .dockerignore
git commit -m "deploy: them Containerfile build image Frappe v15 + akf_farm"
```

---

## Phase 3 — Compose hợp nhất + nginx frontend

### Task 5: Sửa `frontend/nginx.conf` trỏ về service backend

**Files:**
- Modify: `frontend/nginx.conf`

- [ ] **Step 1: Thay block proxy**

Trong `frontend/nginx.conf`, thay 3 block `location /api/`, `/files/`, `/private/` (đang `proxy_pass http://akf-backend:8000`) và thêm `/socket.io/` bằng nội dung sau (giữ nguyên phần `gzip`, `/assets/`, SPA fallback):
```nginx
    # API + file Frappe (cung goc) -> service backend trong compose.
    # Host=akf.localhost de Frappe phan giai site (doc lap voi domain VPS).
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host akf.localhost;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /files/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host akf.localhost;
    }
    location /private/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host akf.localhost;
    }
    # Realtime (Frappe socketio)
    location /socket.io/ {
        proxy_pass http://websocket:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host akf.localhost;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
```

- [ ] **Step 2: Kiểm tra không còn tham chiếu host-gateway cũ**

Run: `grep -n "akf-backend" frontend/nginx.conf || echo "clean"`
Expected: `clean`.

- [ ] **Step 3: Commit**

```bash
git add frontend/nginx.conf
git commit -m "deploy: nginx frontend tro upstream backend:8000 + them /socket.io"
```

### Task 6: Tạo `.env.example` và `docker-compose.yml` hợp nhất

**Files:**
- Create: `.env.example`
- Modify (thay toàn bộ): `docker-compose.yml`

- [ ] **Step 1: Tạo `.env.example`**

Create `/c/Users/SE-HiepNM/akf-farm/.env.example`:
```
# Copy thanh .env va doi gia tri khi deploy that
SITE_NAME=akf.localhost
ADMIN_PASSWORD=admin
DB_ROOT_PASSWORD=akf-root-pass
FRAPPE_BRANCH=version-15
SEED_DEMO=0
HTTP_PORT=80
```

- [ ] **Step 2: Thay nội dung `docker-compose.yml`**

Ghi đè `/c/Users/SE-HiepNM/akf-farm/docker-compose.yml`:
```yaml
# Stack AKF hop nhat (mot lenh): docker compose up -d --build
# Frontend React (cong ${HTTP_PORT:-80}) + Frappe v15 backend + akf_farm.
# Tao .env tu .env.example truoc khi chay.

x-backend-defaults: &backend-defaults
  image: akf-farm-backend:latest
  build:
    context: .
    dockerfile: deploy/Containerfile
    args:
      FRAPPE_BRANCH: ${FRAPPE_BRANCH:-version-15}
  restart: unless-stopped
  depends_on:
    create-site:
      condition: service_completed_successfully
  volumes:
    - sites:/home/frappe/frappe-bench/sites
    - logs:/home/frappe/frappe-bench/logs
  environment:
    FRAPPE_REDIS_CACHE: redis://redis-cache:6379
    FRAPPE_REDIS_QUEUE: redis://redis-queue:6379

services:
  frontend:
    build:
      context: ./frontend
    image: akf-farm-web:latest
    restart: unless-stopped
    depends_on:
      - backend
      - websocket
    ports:
      - "${HTTP_PORT:-80}:80"

  backend:
    <<: *backend-defaults
    # CMD mac dinh = start.sh (gunicorn)

  websocket:
    <<: *backend-defaults
    command:
      - node
      - /home/frappe/frappe-bench/apps/frappe/socketio.js

  scheduler:
    <<: *backend-defaults
    command: ["bench", "schedule"]

  queue-short:
    <<: *backend-defaults
    command: ["bench", "worker", "--queue", "short,default"]

  queue-long:
    <<: *backend-defaults
    command: ["bench", "worker", "--queue", "long,default,short"]

  configurator:
    image: akf-farm-backend:latest
    build:
      context: .
      dockerfile: deploy/Containerfile
    restart: "no"
    depends_on:
      db:
        condition: service_healthy
      redis-cache:
        condition: service_started
      redis-queue:
        condition: service_started
    volumes:
      - sites:/home/frappe/frappe-bench/sites
      - logs:/home/frappe/frappe-bench/logs
    environment:
      DB_HOST: db
      DB_PORT: "3306"
      REDIS_CACHE: redis-cache:6379
      REDIS_QUEUE: redis-queue:6379
      SOCKETIO_PORT: "9000"
    entrypoint: ["bash", "-c"]
    command:
      - >
        ls -1 apps > sites/apps.txt;
        bench set-config -g db_host $$DB_HOST;
        bench set-config -gp db_port $$DB_PORT;
        bench set-config -g redis_cache "redis://$$REDIS_CACHE";
        bench set-config -g redis_queue "redis://$$REDIS_QUEUE";
        bench set-config -g redis_socketio "redis://$$REDIS_QUEUE";
        bench set-config -gp socketio_port $$SOCKETIO_PORT;

  create-site:
    image: akf-farm-backend:latest
    build:
      context: .
      dockerfile: deploy/Containerfile
    restart: "no"
    depends_on:
      configurator:
        condition: service_completed_successfully
    volumes:
      - sites:/home/frappe/frappe-bench/sites
      - logs:/home/frappe/frappe-bench/logs
    environment:
      SITE_NAME: ${SITE_NAME:-akf.localhost}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-admin}
      DB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-akf-root-pass}
      SEED_DEMO: ${SEED_DEMO:-0}
    entrypoint: ["bash", "-c"]
    command:
      - >
        wait-for-it -t 120 db:3306;
        wait-for-it -t 120 redis-cache:6379;
        wait-for-it -t 120 redis-queue:6379;
        if [ ! -d "sites/$$SITE_NAME" ]; then
          bench new-site "$$SITE_NAME"
            --mariadb-user-host-login-scope='%'
            --admin-password="$$ADMIN_PASSWORD"
            --db-root-username=root
            --db-root-password="$$DB_ROOT_PASSWORD"
            --install-app akf_farm --set-default;
          if [ "$$SEED_DEMO" = "1" ]; then
            echo "import akf_farm.seed as s; s.run()" | bench --site "$$SITE_NAME" console;
          fi;
        fi;
        bench --site "$$SITE_NAME" migrate;

  db:
    image: mariadb:11.8
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      start_period: 10s
      interval: 5s
      timeout: 5s
      retries: 10
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --skip-character-set-client-handshake
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-akf-root-pass}
      MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-akf-root-pass}
    volumes:
      - db-data:/var/lib/mysql

  redis-cache:
    image: redis:alpine
    restart: unless-stopped

  redis-queue:
    image: redis:alpine
    restart: unless-stopped
    volumes:
      - redis-queue-data:/data

volumes:
  sites:
  logs:
  db-data:
  redis-queue-data:
```

- [ ] **Step 3: Validate cú pháp compose**

Run:
```bash
cd /c/Users/SE-HiepNM/akf-farm && cp .env.example .env && docker compose config >/dev/null && echo "COMPOSE OK"
```
Expected: `COMPOSE OK` (không lỗi YAML/biến).

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "deploy: docker-compose hop nhat (frontend+backend+db+redis, 1 lenh)"
```

### Task 7: Chạy end-to-end trên máy sạch

**Files:** không sửa; chỉ chạy & nghiệm thu.

> Lưu ý cổng 80: dừng dev-stack `akf` trước nếu nó chiếm cổng, nhưng `akf` dùng 8000/8080 nên không đụng 80. Vẫn nên `docker compose -p akf ... down` để tránh nhầm lẫn site.

- [ ] **Step 1: Up sạch**

Run:
```bash
cd /c/Users/SE-HiepNM/akf-farm
docker compose down -v 2>/dev/null
docker compose up -d --build 2>&1 | tail -20
```
Expected: build xong, các service tạo. (Lần đầu build lâu.)

- [ ] **Step 2: Chờ one-shot create-site hoàn tất**

Run:
```bash
docker compose logs create-site 2>&1 | tail -30
```
Expected: thấy `Site akf.localhost created` (hoặc đã tồn tại) và migrate chạy, container `create-site` Exited (0).

- [ ] **Step 3: Kiểm tra service chạy dài đều Up**

Run: `docker compose ps`
Expected: `frontend`, `backend`, `websocket`, `scheduler`, `queue-short`, `queue-long`, `db`, `redis-*` đều `Up`; `configurator`/`create-site` `Exited (0)`.

- [ ] **Step 4: Frontend trả index React**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost/`
Expected: `200`.

- [ ] **Step 5: API Frappe trả về qua proxy**

Run: `curl -s http://localhost/api/method/ping`
Expected: JSON chứa `"message":"pong"`.

- [ ] **Step 6: Field mandays đã migrate**

Run:
```bash
docker compose exec -T backend bash -lc 'bench --site akf.localhost mariadb -e "SHOW COLUMNS FROM \`tabFarm Task\` LIKE \"mandays\";"'
```
Expected: một dòng cột `mandays`.

- [ ] **Step 7: Dữ liệu bền sau restart**

Run:
```bash
docker compose restart backend db && sleep 10 && curl -s http://localhost/api/method/ping
```
Expected: vẫn `pong`; site không bị tạo lại (volume bền).

---

## Phase 4 — Tài liệu

### Task 8: Cập nhật README + ghi chú memory

**Files:**
- Modify: `README.md`
- (Ngoài repo) memory `akf-two-docker-projects.md`

- [ ] **Step 1: Cập nhật README phần chạy/deploy**

Trong `README.md`, thay hướng dẫn cũ (2 compose, cổng 8080, host-gateway) bằng:
```markdown
## Chạy toàn bộ bằng một lệnh (deploy)

    cp .env.example .env   # đổi mật khẩu khi deploy thật
    docker compose up -d --build

Mở http://localhost (cổng 80). Stack gồm: frontend (React/nginx) +
Frappe v15 backend (gunicorn, scheduler, workers, websocket) + MariaDB + Redis.
Site `akf.localhost` được tạo & cài app tự động lần đầu; dữ liệu lưu ở volume.

### Dev (live-edit)
Vẫn dùng devcontainer frappe_docker (project `akf`) — xem docs/memory.
App nằm ở `backend/akf_farm`, frontend ở `frontend/`.
```

- [ ] **Step 2: Cập nhật memory `akf-two-docker-projects.md`**

Thêm ghi chú: nay repo đã có `docker-compose.yml` hợp nhất (1 lệnh, cổng 80) cho deploy; project `akf-farm` web-only host-gateway cũ đã bị thay. Dev vẫn dùng project `akf` (frappe_docker).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: cap nhat README deploy mot lenh + cau truc frontend/backend"
```

- [ ] **Step 4: Push**

```bash
git push origin main
```
Expected: push thành công.

---

## Self-Review (đã thực hiện khi viết plan)

- **Spec coverage:** Mục tiêu 1 (một compose, cổng 80) → Task 6/7; Mục tiêu 2 (stack prod chuẩn) → Task 6 (services) + Task 4 (image gunicorn/workers); Mục tiêu 3 (self-contained) → Task 3 (vendor resources) + Task 4 (build context repo); Mục tiêu 4 (đặt tên frontend/backend) → Task 1. Image build → Task 4. nginx/network → Task 5. Data/lifecycle (create-site/migrate/seed) → Task 6. Ảnh hưởng dev (symlink, đường test, memory) → Task 2 + Task 8. Kiểm thử mục 9 → Task 7. Không có mục spec nào thiếu task.
- **Placeholder scan:** Hai chỗ cần engineer điền giá trị thực tế là `<NEW_PATH>` (Task 2, có công thức suy ra) và mật khẩu trong `.env` — đây là dữ liệu môi trường, không phải placeholder code.
- **Type/Name consistency:** Tên service (`backend`, `websocket`, `db`, `redis-cache`, `redis-queue`) khớp giữa compose, nginx.conf, và biến môi trường; image tag `akf-farm-backend:latest` nhất quán; site `akf.localhost` nhất quán giữa nginx `Host`, create-site, và lệnh kiểm thử.
