# Kế hoạch triển khai Backend GĐ1 — AKF (ERPNext headless + `akf_farm`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng backend GĐ1 dạng ERPNext/Frappe v15 headless (custom app `akf_farm`): DocTypes + engine sinh việc/cân tải/trạng thái/KPI + lớp REST API khớp shape frontend + auth 2 vai trò, và nối frontend React (`web/`) từ mockData sang API thật.

**Architecture:** Toàn bộ tùy biến nằm trong app `akf_farm`. React SPA là giao diện duy nhất, gọi custom whitelisted endpoints (`/api/method/akf_farm.api.*`) trả JSON đúng cấu trúc `mockData.ts`. Triển khai same-origin qua nginx (React tĩnh ở `/`, proxy `/api`,`/files` về Frappe). Engine là module Python thuần + scheduled job. Bản đồ nhiệt: backend chỉ trả `plot.crops[]`, việc trộn màu theo tỷ lệ giữ nguyên ở FE.

**Tech Stack:** Python 3.11, Frappe/ERPNext v15, MariaDB, Redis, frappe_docker, React 18 + TS + Vite (đã có), nginx.

**Tham chiếu:** spec `docs/superpowers/specs/2026-06-16-akf-backend-erpnext-headless-design.md`; nghiệp vụ `docs/superpowers/specs/2026-06-14-akf-gd1-overview-design.md`; data shape `web/src/lib/mockData.ts`.

---

## Quy ước chung

- **Site dev:** `akf.localhost`. Lệnh test engine/API: `bench --site akf.localhost run-tests --app akf_farm --module <module>`.
- **Đường dẫn app:** trong container Frappe ở `apps/akf_farm/akf_farm/`. Các path dưới đây tương đối từ `apps/akf_farm/akf_farm/`.
- **Status keys** thống nhất với FE: cây dùng `good|warning|danger|done|pending|inactive`; task dùng `pending|in-progress|completed|overdue`.
- **Frequency enum:** `one_time|daily|every_n_days|n_per_day`. **Scope enum:** `per_crop|shared`.
- Mỗi task kết thúc bằng commit. Message commit **không dùng dấu ngoặc kép** (theo lưu ý môi trường PowerShell của repo).

---

## Cấu trúc file chính

```
apps/akf_farm/akf_farm/
├── doctype/
│   ├── farm_zone/{farm_zone.json, farm_zone.py, test_farm_zone.py}
│   ├── farm_block/...
│   ├── cultivation_process/...
│   ├── cultivation_step/...                 # child table
│   ├── crop_cycle/...
│   ├── farm_task/...
│   ├── daily_production/...
│   ├── abnormal_report/...
│   ├── support_request/...
│   ├── team_leader_report/...
│   ├── team_member/...
│   ├── akf_settings/...                      # Single
│   └── farm_task_photo/...                   # child table ảnh (dùng lại cho report)
├── engine/
│   ├── frequency.py + test_frequency.py
│   ├── task_generator.py + test_task_generator.py
│   ├── workload_balancer.py + test_workload_balancer.py
│   ├── status_calculator.py + test_status_calculator.py
│   └── leader_kpi.py + test_leader_kpi.py
├── api/
│   ├── auth_api.py
│   ├── admin_api.py
│   ├── field_api.py
│   ├── sheet_import.py
│   └── serializers.py                        # build JSON khớp mockData shape
├── tests/test_api_admin.py, test_api_field.py
├── seed.py
└── hooks.py                                  # scheduler_events, roles, fixtures

web/src/
├── lib/api.ts                                # fetch wrapper
├── lib/auth.tsx                              # AuthContext + useAuth
├── lib/queries.ts                            # hàm gọi từng domain
├── components/RequireAuth.tsx                # route guard
└── (sửa 23 file đang import mockData)
docker-compose.yml (gộp frappe_docker), web/nginx.conf (proxy /api)
```

---

# GÓI 0 — Môi trường & khung dự án

## Task 0.1: Dựng frappe_docker dev + tạo app akf_farm

**Files:**
- Create: `docker/frappe/docker-compose.dev.yml`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Lấy frappe_docker và tạo container dev**

Run:
```bash
git clone https://github.com/frappe/frappe_docker docker/frappe
cd docker/frappe
cp devcontainer-example .devcontainer && cp development/vscode-example development/.vscode || true
docker compose -f .devcontainer/docker-compose.yml up -d
```

- [ ] **Step 2: Khởi tạo bench + site + app trong container**

Run (trong container `frappe`):
```bash
bench init --frappe-branch version-15 frappe-bench && cd frappe-bench
bench get-app --branch version-15 erpnext
bench new-site akf.localhost --admin-password admin --mariadb-root-password 123 --install-app erpnext
bench new-app akf_farm --no-git
bench --site akf.localhost install-app akf_farm
bench --site akf.localhost set-config developer_mode 1
bench use akf.localhost
```

- [ ] **Step 3: Viết test smoke**

Create `apps/akf_farm/akf_farm/tests/test_smoke.py`:
```python
import frappe
from frappe.tests.utils import FrappeTestCase


class TestSmoke(FrappeTestCase):
    def test_app_installed(self):
        self.assertIn("akf_farm", frappe.get_installed_apps())
```

- [ ] **Step 4: Chạy test smoke**

Run: `bench --site akf.localhost run-tests --app akf_farm --module akf_farm.tests.test_smoke`
Expected: 1 test OK.

- [ ] **Step 5: Commit**

```bash
git add apps/akf_farm docker/frappe/.devcontainer
git commit -m "chore: scaffold akf_farm app + frappe_docker dev env"
```

---

# GÓI 1 — DocTypes (mô hình dữ liệu)

> Mỗi DocType: tạo `*.json` (định nghĩa trường) + `*.py` (controller/validate) + `test_*.py`. Tạo trong developer_mode để Frappe ghi JSON ra app. Test dùng `FrappeTestCase` (tự rollback DB sau mỗi test).

## Task 1.1: Farm Zone

**Files:**
- Create: `doctype/farm_zone/farm_zone.json`, `farm_zone.py`, `test_farm_zone.py`

- [ ] **Step 1: Test thất bại**

Create `doctype/farm_zone/test_farm_zone.py`:
```python
import frappe
from frappe.tests.utils import FrappeTestCase


class TestFarmZone(FrappeTestCase):
    def test_create_zone_with_area_and_boundary(self):
        z = frappe.get_doc({
            "doctype": "Farm Zone",
            "zone_name": "Vùng A",
            "area": 50000,
            "boundary": '{"type":"Polygon","coordinates":[]}',
        }).insert()
        again = frappe.get_doc("Farm Zone", z.name)
        self.assertEqual(again.area, 50000)

    def test_reject_non_positive_area(self):
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "X", "area": 0}).insert()
```

- [ ] **Step 2: Chạy test → fail** (`run-tests ... --module akf_farm.doctype.farm_zone.test_farm_zone`) — Expected: lỗi DocType "Farm Zone" chưa tồn tại.

- [ ] **Step 3: Định nghĩa DocType**

Create `doctype/farm_zone/farm_zone.json`:
```json
{
 "doctype": "DocType", "name": "Farm Zone", "module": "Akf Farm",
 "naming_rule": "Expression (old style)", "autoname": "field:zone_name",
 "fields": [
  {"fieldname": "zone_name", "label": "Tên vùng", "fieldtype": "Data", "reqd": 1, "unique": 1},
  {"fieldname": "area", "label": "Diện tích (m2)", "fieldtype": "Float", "reqd": 1},
  {"fieldname": "boundary", "label": "Ranh giới (GeoJSON)", "fieldtype": "Code", "options": "JSON"},
  {"fieldname": "status", "label": "Trạng thái", "fieldtype": "Select", "options": "good\nwarning\ndanger\ninactive", "default": "good"},
  {"fieldname": "note", "label": "Ghi chú", "fieldtype": "Small Text"}
 ],
 "permissions": [{"role": "AKF Admin", "read": 1, "write": 1, "create": 1, "delete": 1}]
}
```

Create `doctype/farm_zone/farm_zone.py`:
```python
import frappe
from frappe.model.document import Document


class FarmZone(Document):
    def validate(self):
        if not self.area or self.area <= 0:
            frappe.throw("Diện tích vùng phải lớn hơn 0")
```

- [ ] **Step 4: Migrate + chạy test → pass**

Run: `bench --site akf.localhost migrate && bench --site akf.localhost run-tests --app akf_farm --module akf_farm.doctype.farm_zone.test_farm_zone`
Expected: 2 tests OK.

- [ ] **Step 5: Commit**

```bash
git add apps/akf_farm/akf_farm/doctype/farm_zone
git commit -m "feat: DocType Farm Zone"
```

## Task 1.2: Farm Block (Lô)

**Files:** Create `doctype/farm_block/farm_block.json`, `farm_block.py`, `test_farm_block.py`

- [ ] **Step 1: Test thất bại**
```python
import frappe
from frappe.tests.utils import FrappeTestCase


class TestFarmBlock(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Vùng Test"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Vùng Test", "area": 50000}).insert()

    def test_create_block_in_zone(self):
        b = frappe.get_doc({
            "doctype": "Farm Block", "block_name": "Lô T1",
            "zone": "Vùng Test", "area": 12500, "status": "good",
        }).insert()
        self.assertEqual(frappe.get_doc("Farm Block", b.name).zone, "Vùng Test")
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Định nghĩa DocType**

`farm_block.json` fields: `block_name` (Data, reqd), `zone` (Link → Farm Zone, reqd), `area` (Float, reqd), `boundary` (Code/JSON), `team_leader` (Link → User), `status` (Select `good\nwarning\ndanger\ninactive`, default good). autoname `field:block_name`. permissions AKF Admin full; AKF Team Leader read.

`farm_block.py`:
```python
import frappe
from frappe.model.document import Document


class FarmBlock(Document):
    def validate(self):
        if not self.area or self.area <= 0:
            frappe.throw("Diện tích lô phải lớn hơn 0")
        # Cảnh báo (không chặn) nếu tổng diện tích lô vượt diện tích vùng
        zone_area = frappe.db.get_value("Farm Zone", self.zone, "area") or 0
        total = frappe.db.sql(
            "select coalesce(sum(area),0) from `tabFarm Block` where zone=%s and name!=%s",
            (self.zone, self.name or ""))[0][0]
        if zone_area and total + (self.area or 0) > zone_area:
            frappe.msgprint("Tổng diện tích lô vượt diện tích vùng", indicator="orange")
```

- [ ] **Step 4: Migrate + test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: DocType Farm Block"`

## Task 1.3: Cultivation Process + Cultivation Step (child)

**Files:** Create `doctype/cultivation_step/cultivation_step.json` (child), `doctype/cultivation_process/{cultivation_process.json,.py,test_*.py}`

- [ ] **Step 1: Test thất bại**
```python
import frappe
from frappe.tests.utils import FrappeTestCase


class TestCultivationProcess(FrappeTestCase):
    def test_process_with_steps(self):
        p = frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "Quy trình Gấc test", "crop": "Gấc",
            "steps": [
                {"step": 1, "description": "Chuẩn bị đất", "mandays_per_ha": 10,
                 "frequency_type": "one_time", "frequency_value": 1, "scope": "shared", "require_photo": 1},
                {"step": 2, "description": "Tưới nước", "mandays_per_ha": 2,
                 "frequency_type": "every_n_days", "frequency_value": 2, "scope": "per_crop", "require_photo": 0},
            ],
        }).insert()
        self.assertEqual(len(frappe.get_doc("Cultivation Process", p.name).steps), 2)
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Định nghĩa 2 DocType**

`cultivation_step.json`: `"istable": 1`; fields: `step` (Int), `description` (Data, reqd), `mandays_per_ha` (Float), `frequency_type` (Select `one_time\ndaily\nevery_n_days\nn_per_day`), `frequency_value` (Int, default 1), `scope` (Select `per_crop\nshared`, default per_crop), `require_photo` (Check).

`cultivation_process.json`: `process_name` (Data, reqd, unique), `crop` (Select `Gấc\nSâm`), `steps` (Table → Cultivation Step). autoname `field:process_name`.

`cultivation_process.py`: controller rỗng (`class CultivationProcess(Document): pass`).

- [ ] **Step 4: Migrate + test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: DocType Cultivation Process + Step"`

## Task 1.4: Crop Cycle

**Files:** Create `doctype/crop_cycle/{crop_cycle.json,.py,test_*.py}`

- [ ] **Step 1: Test thất bại** (1 block có 2 cycle active khác cây OK; chặn 2 cycle cùng cây active)
```python
import frappe
from frappe.tests.utils import FrappeTestCase


class TestCropCycle(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Vùng CC"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Vùng CC", "area": 50000}).insert()
        if not frappe.db.exists("Farm Block", "Lô CC1"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "Lô CC1", "zone": "Vùng CC", "area": 10000}).insert()

    def _mk(self, crop):
        return frappe.get_doc({"doctype": "Crop Cycle", "block": "Lô CC1", "crop": crop,
                               "start_date": "2026-05-01", "status": "active"}).insert()

    def test_two_crops_active_ok(self):
        self._mk("Gấc"); self._mk("Sâm")
        self.assertEqual(frappe.db.count("Crop Cycle", {"block": "Lô CC1", "status": "active"}), 2)

    def test_block_same_crop_twice_active_rejected(self):
        self._mk("Gấc")
        with self.assertRaises(frappe.ValidationError):
            self._mk("Gấc")
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Định nghĩa DocType + validate**

`crop_cycle.json`: `block` (Link → Farm Block, reqd), `crop` (Select `Gấc\nSâm`, reqd), `process` (Link → Cultivation Process), `start_date` (Date, reqd), `status` (Select `active\nclosed`, default active). autoname `format:CC-{block}-{crop}-{#####}`.

`crop_cycle.py`:
```python
import frappe
from frappe.model.document import Document


class CropCycle(Document):
    def validate(self):
        if self.status == "active":
            dup = frappe.db.exists("Crop Cycle", {
                "block": self.block, "crop": self.crop, "status": "active",
                "name": ("!=", self.name or ""),
            })
            if dup:
                frappe.throw(f"Lô {self.block} đã có chu kỳ {self.crop} đang hoạt động")
```

- [ ] **Step 4: Migrate + test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: DocType Crop Cycle"`

## Task 1.5: Farm Task + child Farm Task Photo

**Files:** Create `doctype/farm_task_photo/farm_task_photo.json` (child), `doctype/farm_task/{farm_task.json,.py,test_*.py}`

- [ ] **Step 1: Test thất bại**
```python
import frappe
from frappe.tests.utils import FrappeTestCase


class TestFarmTask(FrappeTestCase):
    def setUp(self):
        for n, dt, extra in [
            ("Vùng FT", "Farm Zone", {"area": 50000}),
        ]:
            if not frappe.db.exists(dt, n):
                frappe.get_doc({"doctype": dt, "zone_name": n, **extra}).insert()
        if not frappe.db.exists("Farm Block", "Lô FT1"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "Lô FT1", "zone": "Vùng FT", "area": 10000}).insert()

    def test_create_task(self):
        t = frappe.get_doc({
            "doctype": "Farm Task", "title": "Tưới nước", "block": "Lô FT1", "crop": "Gấc",
            "task_date": "2026-06-14", "status": "pending", "priority": "normal",
        }).insert()
        self.assertEqual(frappe.get_doc("Farm Task", t.name).status, "pending")
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Định nghĩa DocType**

`farm_task_photo.json`: `"istable":1`; field `image` (Attach Image).

`farm_task.json` fields: `title` (Data, reqd), `block` (Link → Farm Block, reqd), `crop` (Select `Gấc\nSâm`, reqd), `cycle` (Link → Crop Cycle), `task_date` (Date, reqd), `team_leader` (Link → User), `status` (Select `pending\nin-progress\ncompleted\noverdue`, default pending), `require_photo` (Check), `priority` (Select `normal\nhigh\nurgent`, default normal), `photos` (Table → Farm Task Photo), `client_uuid` (Data, unique — chống gửi trùng từ offline). autoname `hash`.

`farm_task.py`: `class FarmTask(Document): pass`.

- [ ] **Step 4: Migrate + test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: DocType Farm Task + Photo"`

## Task 1.6: Daily Production, Abnormal Report, Support Request, Team Leader Report, Team Member

**Files:** Create 5 DocType folders dưới `doctype/` (mỗi cái json+py+test gộp 1 test file `tests/test_records.py`)

- [ ] **Step 1: Test thất bại** — Create `tests/test_records.py`:
```python
import frappe
from frappe.tests.utils import FrappeTestCase


class TestRecordDoctypes(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Vùng RC"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Vùng RC", "area": 50000}).insert()
        if not frappe.db.exists("Farm Block", "Lô RC1"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "Lô RC1", "zone": "Vùng RC", "area": 10000}).insert()

    def test_abnormal_report(self):
        a = frappe.get_doc({"doctype": "Abnormal Report", "type": "Sâu bệnh", "block": "Lô RC1",
                            "crop": "Gấc", "report_date": "2026-06-13", "description": "Sâu",
                            "status": "pending"}).insert()
        self.assertEqual(a.status, "pending")

    def test_support_request(self):
        s = frappe.get_doc({"doctype": "Support Request", "block": "Lô RC1", "type": "Vật tư",
                            "content": "Cần phân", "status": "pending"}).insert()
        self.assertTrue(s.name)

    def test_team_member(self):
        m = frappe.get_doc({"doctype": "Team Member", "member_name": "Nguyễn Văn G",
                            "phone": "0907890123"}).insert()
        self.assertTrue(m.name)
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Định nghĩa 5 DocType**

- **Daily Production:** `block` (Link), `crop` (Select Gấc/Sâm), `prod_date` (Date), `quantity` (Float), `unit` (Data), `note` (Small Text).
- **Abnormal Report:** `type` (Data), `block` (Link, reqd), `crop` (Select), `reporter` (Link User), `report_date` (Date), `description` (Text, reqd), `photos` (Table → Farm Task Photo), `status` (Select `pending\nin-progress\nresolved`, default pending), `reply` (Small Text), `client_uuid` (Data, unique).
- **Support Request:** `team_leader` (Link User), `block` (Link), `type` (Select `Vật tư\nNhân lực\nKỹ thuật\nThiết bị\nKhác`), `content` (Text, reqd), `photos` (Table → Farm Task Photo), `sent_at` (Datetime), `status` (Select `pending\napproved\nrejected\nreplied\ndone`, default pending), `reply` (Small Text).
- **Team Leader Report:** `team_leader` (Link User), `block` (Link), `crop` (Select), `report_date` (Date), `content` (Text), `photos` (Table → Farm Task Photo), `abnormal` (Check), `status` (Select `pending\nreviewed\nreplied`, default pending), `reply` (Small Text), `client_uuid` (Data, unique).
- **Team Member:** `member_name` (Data, reqd), `phone` (Data), `team_leader` (Link User), `status` (Select `active\ninactive`, default active).

Controller `.py` của từng cái: `pass`.

- [ ] **Step 4: Migrate + test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: DocTypes record (production, abnormal, support, report, member)"`

## Task 1.7: AKF Settings (Single)

**Files:** Create `doctype/akf_settings/{akf_settings.json,.py}`

- [ ] **Step 1: Test thất bại** — thêm vào `tests/test_records.py`:
```python
    def test_settings_single(self):
        s = frappe.get_single("AKF Settings")
        s.app_name = "AKF"
        s.save()
        self.assertEqual(frappe.get_single("AKF Settings").app_name, "AKF")
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Định nghĩa DocType** `"issingle":1`; fields: `app_name`, `company_name`, `contact`, `logo_text` (Data); `smtp_host`, `smtp_port`, `from_email`, `from_name` (Data), `email_enabled` (Check).

- [ ] **Step 4: Migrate + test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: DocType AKF Settings (single)"`

---

# GÓI 2 — Engines (lõi)

## Task 2.1: Parser tần suất

**Files:** Create `engine/__init__.py`, `engine/frequency.py`, `engine/test_frequency.py`

- [ ] **Step 1: Test thất bại** — Create `engine/test_frequency.py`:
```python
import unittest
from akf_farm.engine.frequency import parse_frequency


class TestFrequency(unittest.TestCase):
    def test_every_n_days(self):
        self.assertEqual(parse_frequency("7 ngày/lần"), ("every_n_days", 7))
        self.assertEqual(parse_frequency("2 ngày/lần"), ("every_n_days", 2))

    def test_daily(self):
        self.assertEqual(parse_frequency("Hàng ngày"), ("daily", 1))
        self.assertEqual(parse_frequency("1 ngày/lần"), ("daily", 1))

    def test_n_per_day(self):
        self.assertEqual(parse_frequency("2 lần/ngày"), ("n_per_day", 2))

    def test_one_time(self):
        self.assertEqual(parse_frequency("1 lần/chu kỳ"), ("one_time", 1))
```

- [ ] **Step 2: Chạy test → fail** — `bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_frequency`. Expected: ImportError.

- [ ] **Step 3: Triển khai** — Create `engine/frequency.py`:
```python
import re


def parse_frequency(text: str):
    """Trả (frequency_type, value). Mặc định an toàn = one_time."""
    t = (text or "").strip().lower()
    if "chu kỳ" in t or "1 lần/chu" in t:
        return ("one_time", 1)
    if "hàng ngày" in t:
        return ("daily", 1)
    m = re.search(r"(\d+)\s*lần\s*/\s*ngày", t)
    if m:
        return ("n_per_day", int(m.group(1)))
    m = re.search(r"(\d+)\s*ngày\s*/\s*lần", t)
    if m:
        n = int(m.group(1))
        return ("daily", 1) if n == 1 else ("every_n_days", n)
    return ("one_time", 1)
```

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: engine parse_frequency"`

## Task 2.2: Quy đổi công theo diện tích

**Files:** Create `engine/task_generator.py`, `engine/test_task_generator.py`

- [ ] **Step 1: Test thất bại** — Create `engine/test_task_generator.py`:
```python
import unittest
from akf_farm.engine.task_generator import compute_mandays


class TestComputeMandays(unittest.TestCase):
    def test_per_ha_times_area(self):
        # step 3 công/ha trên lô 2ha (20000 m2) -> 6 công
        self.assertEqual(compute_mandays(3.0, 20000), 6.0)

    def test_shared_no_manday_is_zero(self):
        self.assertEqual(compute_mandays(0, 20000), 0)
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai** — trong `engine/task_generator.py`:
```python
def compute_mandays(mandays_per_ha: float, area_m2: float) -> float:
    ha = (area_m2 or 0) / 10000.0
    return round((mandays_per_ha or 0) * ha, 2)
```

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: engine compute_mandays"`

## Task 2.3: Tính ngày đến hạn theo tần suất

**Files:** Modify `engine/task_generator.py`, `engine/test_task_generator.py`

- [ ] **Step 1: Test thất bại** — thêm vào test file:
```python
import datetime as dt
from akf_farm.engine.task_generator import due_dates


class TestDueDates(unittest.TestCase):
    def d(self, s):
        return dt.date.fromisoformat(s)

    def test_every_n_days(self):
        out = due_dates(self.d("2026-01-01"), ("every_n_days", 20), self.d("2026-01-01"), self.d("2026-02-15"))
        self.assertEqual(out, [self.d("2026-01-01"), self.d("2026-01-21"), self.d("2026-02-10")])

    def test_daily(self):
        out = due_dates(self.d("2026-01-01"), ("daily", 1), self.d("2026-01-01"), self.d("2026-01-03"))
        self.assertEqual(len(out), 3)

    def test_one_time(self):
        out = due_dates(self.d("2026-01-01"), ("one_time", 1), self.d("2026-01-01"), self.d("2026-02-01"))
        self.assertEqual(out, [self.d("2026-01-01")])

    def test_one_time_before_window(self):
        out = due_dates(self.d("2025-12-01"), ("one_time", 1), self.d("2026-01-01"), self.d("2026-02-01"))
        self.assertEqual(out, [])
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai** — thêm vào `engine/task_generator.py`:
```python
import datetime as dt


def due_dates(start, freq, from_date, to_date):
    """freq=(type,value). Trả list ngày (date) trong [from_date,to_date]."""
    ftype, fval = freq
    fval = max(1, int(fval or 1))
    out = []
    if ftype == "one_time":
        if from_date <= start <= to_date:
            out.append(start)
        return out
    step = 1 if ftype in ("daily", "n_per_day") else fval
    cur = start
    if cur < from_date:
        # nhảy tới mốc đầu tiên >= from_date theo bội số step
        gap = (from_date - start).days
        k = (gap + step - 1) // step
        cur = start + dt.timedelta(days=k * step)
    while cur <= to_date:
        if cur >= from_date:
            out.append(cur)
        cur += dt.timedelta(days=step)
    return out
```

> Ghi chú: `n_per_day` sinh 1 mục/ngày ở mức ngày; số lần/ngày để FE/đếm công nhân thêm — GĐ1 không tách giờ.

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: engine due_dates"`

## Task 2.4: Khử trùng lặp việc dùng chung

**Files:** Modify `engine/task_generator.py`, `engine/test_task_generator.py`

- [ ] **Step 1: Test thất bại** — thêm:
```python
from akf_farm.engine.task_generator import dedupe_shared


class TestDedupeShared(unittest.TestCase):
    def test_shared_same_block_day_merged(self):
        rows = [
            {"block": "B1", "date": "2026-01-01", "description": "Kiểm tra tưới", "scope": "shared", "crop": "Gấc"},
            {"block": "B1", "date": "2026-01-01", "description": "Kiểm tra tưới", "scope": "shared", "crop": "Sâm"},
            {"block": "B1", "date": "2026-01-01", "description": "Tưới nước", "scope": "per_crop", "crop": "Gấc"},
            {"block": "B1", "date": "2026-01-01", "description": "Tưới nước", "scope": "per_crop", "crop": "Sâm"},
        ]
        out = dedupe_shared(rows)
        # 1 shared gộp + 2 per_crop riêng = 3
        self.assertEqual(len(out), 3)
        shared = [r for r in out if r["scope"] == "shared"]
        self.assertEqual(len(shared), 1)
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai** — thêm:
```python
def dedupe_shared(rows):
    """Gộp việc scope=shared trùng (block, date, description). per_crop giữ nguyên."""
    seen = set()
    out = []
    for r in rows:
        if r.get("scope") == "shared":
            key = (r["block"], str(r["date"]), r["description"])
            if key in seen:
                continue
            seen.add(key)
            r = {**r, "crop": "Chung"}
        out.append(r)
    return out
```

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: engine dedupe_shared"`

## Task 2.5: Sinh việc 10 ngày (idempotent) + scheduled job

**Files:** Modify `engine/task_generator.py`, `engine/test_task_generator.py`; Modify `hooks.py`

- [ ] **Step 1: Test thất bại** — thêm (test có DB, dùng FrappeTestCase):
```python
import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.engine.task_generator import generate_tasks


class TestGenerate(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z GEN"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z GEN", "area": 50000}).insert()
        if not frappe.db.exists("Farm Block", "B GEN"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B GEN", "zone": "Z GEN", "area": 10000}).insert()
        proc = frappe.get_doc({"doctype": "Cultivation Process", "process_name": "P GEN", "crop": "Gấc",
            "steps": [{"step": 1, "description": "Tưới", "mandays_per_ha": 2,
                       "frequency_type": "every_n_days", "frequency_value": 2, "scope": "per_crop"}]}).insert()
        self.cycle = frappe.get_doc({"doctype": "Crop Cycle", "block": "B GEN", "crop": "Gấc",
            "process": proc.name, "start_date": "2026-06-14", "status": "active"}).insert()

    def test_generate_and_idempotent(self):
        n1 = generate_tasks(from_date="2026-06-14", days=10)
        cnt1 = frappe.db.count("Farm Task", {"block": "B GEN"})
        n2 = generate_tasks(from_date="2026-06-14", days=10)  # chạy lại
        cnt2 = frappe.db.count("Farm Task", {"block": "B GEN"})
        self.assertGreater(cnt1, 0)
        self.assertEqual(cnt1, cnt2)  # không tạo trùng
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai** — thêm vào `engine/task_generator.py`:
```python
import frappe
from frappe.utils import add_days, getdate
from akf_farm.engine.frequency import parse_frequency


def generate_tasks(from_date=None, days=10):
    from_d = getdate(from_date) if from_date else getdate()
    to_d = getdate(add_days(from_d, days - 1))
    created = 0
    cycles = frappe.get_all("Crop Cycle", filters={"status": "active"},
                            fields=["name", "block", "crop", "process", "start_date"])
    rows = []
    for c in cycles:
        if not c.process:
            continue
        proc = frappe.get_doc("Cultivation Process", c.process)
        area = frappe.db.get_value("Farm Block", c.block, "area") or 0
        for s in proc.steps:
            freq = (s.frequency_type, s.frequency_value) if s.frequency_type else parse_frequency("")
            for d in due_dates(getdate(c.start_date), freq, from_d, to_d):
                rows.append({"cycle": c.name, "block": c.block, "crop": c.crop,
                             "date": d, "description": s.description, "scope": s.scope,
                             "require_photo": s.require_photo})
    for r in dedupe_shared(rows):
        # idempotent: khóa theo (block, crop, date, title)
        exists = frappe.db.exists("Farm Task", {"block": r["block"], "crop": r["crop"],
                                                 "task_date": str(r["date"]), "title": r["description"]})
        if exists:
            continue
        frappe.get_doc({"doctype": "Farm Task", "title": r["description"], "block": r["block"],
                        "crop": r["crop"], "cycle": r.get("cycle"), "task_date": str(r["date"]),
                        "status": "pending", "require_photo": r.get("require_photo") or 0}).insert()
        created += 1
    return created
```

- [ ] **Step 4: Chạy test → pass.**

- [ ] **Step 5: Đăng ký scheduler + commit** — thêm vào `hooks.py`:
```python
scheduler_events = {
    "daily": ["akf_farm.engine.task_generator.generate_tasks"],
}
```
```bash
git add apps/akf_farm/akf_farm/engine apps/akf_farm/akf_farm/hooks.py
git commit -m "feat: engine generate_tasks 10 ngay idempotent + scheduler"
```

## Task 2.6: Cân tải gán tổ trưởng

**Files:** Create `engine/workload_balancer.py`, `engine/test_workload_balancer.py`

- [ ] **Step 1: Test thất bại**
```python
import unittest
from akf_farm.engine.workload_balancer import assign_leaders


class TestBalancer(unittest.TestCase):
    def test_prefers_block_owner(self):
        tasks = [{"id": "t1", "block": "B1", "mandays": 5}]
        owners = {"B1": "leaderA"}
        out = assign_leaders(tasks, owners, ["leaderA", "leaderB"])
        self.assertEqual(out["t1"], "leaderA")

    def test_balances_load(self):
        tasks = [{"id": str(i), "block": "B1", "mandays": 1} for i in range(4)]
        owners = {}  # không ai sở hữu -> chia đều
        out = assign_leaders(tasks, owners, ["A", "B"])
        from collections import Counter
        c = Counter(out.values())
        self.assertEqual(c["A"], c["B"])  # 2-2
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai**
```python
def assign_leaders(tasks, block_owner, leaders):
    """Gán mỗi task cho 1 tổ trưởng: ưu tiên chủ block, còn lại chọn người tải thấp nhất."""
    load = {l: 0.0 for l in leaders}
    result = {}
    for t in sorted(tasks, key=lambda x: -float(x.get("mandays", 0))):
        owner = block_owner.get(t["block"])
        if owner in load:
            pick = owner
        else:
            pick = min(load, key=lambda l: load[l])
        result[t["id"]] = pick
        load[pick] += float(t.get("mandays", 0)) or 1
    return result
```

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: engine workload balancer"`

## Task 2.7: Status calculator (theo cây + worst-of) + test trọng số heatmap

**Files:** Create `engine/status_calculator.py`, `engine/test_status_calculator.py`

- [ ] **Step 1: Test thất bại**
```python
import unittest
from akf_farm.engine.status_calculator import crop_status, rollup_status


class TestStatus(unittest.TestCase):
    def test_overdue_is_danger(self):
        self.assertEqual(crop_status(tasks=[{"status": "overdue"}], anomalies=[]), "danger")

    def test_due_not_done_is_warning(self):
        self.assertEqual(crop_status(tasks=[{"status": "pending"}], anomalies=[]), "warning")

    def test_all_done_is_good(self):
        self.assertEqual(crop_status(tasks=[{"status": "completed"}], anomalies=[]), "good")

    def test_unresolved_anomaly_raises(self):
        self.assertEqual(crop_status(tasks=[{"status": "completed"}],
                                     anomalies=[{"status": "pending"}]), "danger")

    def test_rollup_worst_of(self):
        # worst-of: danger > warning > good
        self.assertEqual(rollup_status(["good", "danger", "warning"]), "danger")
        self.assertEqual(rollup_status(["good", "done"]), "good")

    def test_heatmap_weight_uses_total_not_crop_count(self):
        # tài liệu hoá: trọng số trộn màu = total việc, KHÔNG phải số cây.
        # backend chỉ trả total; đây là test bảo vệ contract.
        crops = [{"crop": "Gấc", "status": "good", "done": 3, "total": 3},
                 {"crop": "Sâm", "status": "danger", "done": 1, "total": 5}]
        weights = [c["total"] for c in crops]
        self.assertEqual(weights, [3, 5])
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai**
```python
ORDER = {"danger": 4, "warning": 3, "pending": 2, "good": 1, "done": 1, "inactive": 0}


def crop_status(tasks, anomalies):
    if any(a.get("status") in ("pending", "in-progress") for a in anomalies):
        return "danger" if any(a.get("status") == "pending" for a in anomalies) else "warning"
    if any(t.get("status") == "overdue" for t in tasks):
        return "danger"
    if any(t.get("status") in ("pending", "in-progress") for t in tasks):
        return "warning"
    if tasks and all(t.get("status") == "completed" for t in tasks):
        return "good"
    return "good"


def rollup_status(statuses):
    if not statuses:
        return "good"
    return max(statuses, key=lambda s: ORDER.get(s, 0))
```

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: engine status calculator + heatmap weight contract test"`

## Task 2.8: KPI tổ trưởng

**Files:** Create `engine/leader_kpi.py`, `engine/test_leader_kpi.py`

- [ ] **Step 1: Test thất bại**
```python
import unittest
from akf_farm.engine.leader_kpi import compute_kpi


class TestKpi(unittest.TestCase):
    def test_basic(self):
        tasks = [
            {"status": "completed", "on_time": True, "mandays": 10},
            {"status": "completed", "on_time": False, "mandays": 10},  # quá hạn mới xong
            {"status": "overdue", "on_time": False, "mandays": 10},
            {"status": "pending", "on_time": False, "mandays": 10},
        ]
        report_days = {"2026-06-13": True, "2026-06-14": False}
        k = compute_kpi(tasks, report_days, anomaly_count=2)
        self.assertEqual(k["completed"], 2)
        self.assertEqual(k["overdue"], 1)
        self.assertEqual(k["not_done"], 2)
        self.assertEqual(k["on_time_pct"], 50.0)   # 1/2 completed đúng hạn
        self.assertEqual(k["full_report_pct"], 50.0)
        self.assertEqual(k["anomalies"], 2)
        self.assertEqual(k["total_work"], 40)
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai**
```python
def compute_kpi(tasks, report_days, anomaly_count=0):
    completed = [t for t in tasks if t.get("status") == "completed"]
    overdue = [t for t in tasks if t.get("status") == "overdue"]
    not_done = [t for t in tasks if t.get("status") in ("pending", "in-progress", "overdue")]
    on_time = [t for t in completed if t.get("on_time")]
    on_time_pct = round(100.0 * len(on_time) / len(completed), 1) if completed else 0.0
    full_days = [d for d, ok in report_days.items() if ok]
    full_report_pct = round(100.0 * len(full_days) / len(report_days), 1) if report_days else 0.0
    return {
        "completed": len(completed), "overdue": len(overdue), "not_done": len(not_done),
        "on_time_pct": on_time_pct, "full_report_pct": full_report_pct,
        "anomalies": anomaly_count, "total_work": sum(int(t.get("mandays", 0)) for t in tasks),
    }
```

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: engine leader KPI"`

---

# GÓI 3 — Vai trò & phân quyền

## Task 3.1: Roles + permission query tổ trưởng

**Files:** Create `akf_farm/permissions.py`; Modify `hooks.py`; Create fixtures `fixtures/role.json`; Create `tests/test_permissions.py`

- [ ] **Step 1: Test thất bại** — Create `tests/test_permissions.py`:
```python
import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.permissions import farm_task_query


class TestPermissions(FrappeTestCase):
    def test_leader_query_limits_to_self(self):
        cond = farm_task_query("leaderA@akf.local")
        self.assertIn("team_leader", cond)
        self.assertIn("leaderA@akf.local", cond)

    def test_admin_query_no_limit(self):
        frappe.set_user("Administrator")
        self.assertEqual(farm_task_query("Administrator"), "")
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai** — Create `akf_farm/permissions.py`:
```python
import frappe


def farm_task_query(user=None):
    user = user or frappe.session.user
    roles = frappe.get_roles(user)
    if "AKF Admin" in roles or user == "Administrator":
        return ""
    return f"`tabFarm Task`.team_leader = {frappe.db.escape(user)}"
```

Thêm vào `hooks.py`:
```python
permission_query_conditions = {
    "Farm Task": "akf_farm.permissions.farm_task_query",
}
```

Tạo 2 Role `AKF Admin`, `AKF Team Leader` (Desk hoặc `bench execute`), export vào `fixtures/role.json`; thêm `fixtures = ["Role"]` vào hooks.

- [ ] **Step 4: Migrate + test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: roles + permission query to truong"`

---

# GÓI 4 — Lớp API (custom whitelisted, khớp shape frontend)

> Mục tiêu: JSON trả về khớp tên trường `mockData.ts` (`plotId`, `teamLeaderId`, `crops[]`, `zoneId`...) để FE chỉ đổi nguồn đọc. Helper dựng JSON nằm ở `api/serializers.py`.

## Task 4.1: Auth API

**Files:** Create `api/__init__.py`, `api/auth_api.py`; Create `tests/test_api_auth.py`

- [ ] **Step 1: Test thất bại**
```python
import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import auth_api


class TestAuthApi(FrappeTestCase):
    def test_me_returns_user(self):
        frappe.set_user("Administrator")
        me = auth_api.me()
        self.assertEqual(me["email"], "Administrator")
        self.assertIn("roles", me)
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai** — Create `api/auth_api.py`:
```python
import frappe
from frappe.auth import LoginManager


@frappe.whitelist(allow_guest=True)
def login(usr, pwd):
    lm = LoginManager()
    lm.authenticate(user=usr, pwd=pwd)
    lm.post_login()
    return me()


@frappe.whitelist()
def me():
    user = frappe.session.user
    roles = frappe.get_roles(user)
    role = "admin" if ("AKF Admin" in roles or user == "Administrator") else "team_leader"
    full_name = frappe.db.get_value("User", user, "full_name") or user
    return {"email": user, "full_name": full_name, "role": role, "roles": roles}


@frappe.whitelist()
def logout():
    frappe.local.login_manager.logout()
    return {"ok": True}
```

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: API auth (login/me/logout)"`

## Task 4.2: Serializers (zones/plots khớp shape FE)

**Files:** Create `api/serializers.py`; Create `tests/test_serializers.py`

- [ ] **Step 1: Test thất bại**
```python
import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api.serializers import serialize_plot


class TestSerializers(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z SER"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z SER", "area": 50000}).insert()
        if not frappe.db.exists("Farm Block", "B SER"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B SER", "zone": "Z SER",
                            "area": 12500, "status": "good"}).insert()

    def test_plot_shape(self):
        p = serialize_plot("B SER")
        # khớp mockData: id, name, zoneId, area, status, crops[]
        for key in ("id", "name", "zoneId", "area", "status", "crops"):
            self.assertIn(key, p)
        self.assertIsInstance(p["crops"], list)
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai** — Create `api/serializers.py`:
```python
import frappe
from akf_farm.engine.status_calculator import crop_status, rollup_status


def serialize_crop_on_plot(block, crop):
    tasks = frappe.get_all("Farm Task", filters={"block": block, "crop": crop},
                           fields=["status"])
    anomalies = frappe.get_all("Abnormal Report", filters={"block": block, "crop": crop},
                               fields=["status"])
    done = len([t for t in tasks if t.status == "completed"])
    total = len(tasks)
    return {"crop": crop, "done": done, "total": total,
            "status": crop_status([t.as_dict() for t in tasks], [a.as_dict() for a in anomalies])}


def serialize_plot(block_name):
    b = frappe.get_doc("Farm Block", block_name)
    crops = [c.crop for c in frappe.get_all("Crop Cycle",
             filters={"block": block_name, "status": "active"}, fields=["crop"])]
    crop_objs = [serialize_crop_on_plot(block_name, c) for c in crops]
    statuses = [c["status"] for c in crop_objs] or [b.status]
    return {
        "id": b.name, "name": b.block_name, "zoneId": b.zone, "area": b.area,
        "teamLeader": frappe.db.get_value("User", b.team_leader, "full_name") if b.team_leader else "",
        "teamLeaderId": b.team_leader or "",
        "crops": crop_objs, "crop": " + ".join(crops),
        "done": sum(c["done"] for c in crop_objs), "total": sum(c["total"] for c in crop_objs),
        "status": rollup_status(statuses),
    }
```

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: API serializers (plot shape khop FE)"`

## Task 4.3: Admin API — zones, plots, heatmap

**Files:** Create `api/admin_api.py`; Create `tests/test_api_admin.py`

- [ ] **Step 1: Test thất bại**
```python
import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import admin_api


class TestAdminApi(FrappeTestCase):
    def setUp(self):
        frappe.set_user("Administrator")
        if not frappe.db.exists("Farm Zone", "Z ADM"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z ADM", "area": 40000}).insert()

    def test_list_zones(self):
        zs = admin_api.list_zones()
        self.assertTrue(any(z["name"] == "Z ADM" for z in zs))

    def test_heatmap_returns_plots_with_crops(self):
        data = admin_api.heatmap()
        self.assertIn("zones", data)
        self.assertIn("plots", data)
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai** — Create `api/admin_api.py`:
```python
import frappe
from akf_farm.api.serializers import serialize_plot


@frappe.whitelist()
def list_zones():
    return frappe.get_all("Farm Zone", fields=["name", "zone_name as zoneName", "area", "status"])


@frappe.whitelist()
def list_plots(zone=None):
    filters = {"zone": zone} if zone else {}
    names = [b.name for b in frappe.get_all("Farm Block", filters=filters, fields=["name"])]
    return [serialize_plot(n) for n in names]


@frappe.whitelist()
def heatmap():
    return {"zones": list_zones(), "plots": list_plots()}
```

> CRUD (create/update/delete) zone/plot thêm tương tự bằng `frappe.get_doc(...).insert()/save()/delete()` — mỗi hàm 1 `@frappe.whitelist()`. Bổ sung khi nối từng màn FE (Task 6.x) để tránh API thừa (YAGNI).

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: API admin zones/plots/heatmap"`

## Task 4.4: Admin API — tasks (lịch 10 ngày, lùi lịch, gán lại)

**Files:** Modify `api/admin_api.py`; Modify `tests/test_api_admin.py`

- [ ] **Step 1: Test thất bại** — thêm:
```python
    def test_reschedule_one_crop_only(self):
        frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z TK", "area": 40000}).insert() \
            if not frappe.db.exists("Farm Zone", "Z TK") else None
        if not frappe.db.exists("Farm Block", "B TK"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B TK", "zone": "Z TK", "area": 10000}).insert()
        g = frappe.get_doc({"doctype": "Farm Task", "title": "Tưới gấc", "block": "B TK", "crop": "Gấc",
                            "task_date": "2026-06-14", "status": "pending"}).insert()
        s = frappe.get_doc({"doctype": "Farm Task", "title": "Tưới sâm", "block": "B TK", "crop": "Sâm",
                            "task_date": "2026-06-14", "status": "pending"}).insert()
        admin_api.reschedule_task(g.name, "2026-06-16")
        self.assertEqual(frappe.db.get_value("Farm Task", g.name, "task_date").isoformat(), "2026-06-16")
        self.assertEqual(frappe.db.get_value("Farm Task", s.name, "task_date").isoformat(), "2026-06-14")
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai** — thêm:
```python
@frappe.whitelist()
def calendar(from_date, days=10):
    from frappe.utils import add_days, getdate
    to_date = add_days(getdate(from_date), int(days) - 1)
    tasks = frappe.get_all("Farm Task",
        filters={"task_date": ["between", [from_date, to_date]]},
        fields=["name as id", "title", "block as plotId", "crop", "task_date as date",
                "status", "team_leader as teamLeaderId", "require_photo as requirePhoto", "priority"])
    return tasks


@frappe.whitelist()
def reschedule_task(task, new_date):
    doc = frappe.get_doc("Farm Task", task)
    doc.task_date = new_date  # chỉ đổi 1 task -> độc lập theo cây
    doc.save()
    return {"ok": True}


@frappe.whitelist()
def reassign_task(task, team_leader):
    doc = frappe.get_doc("Farm Task", task)
    doc.team_leader = team_leader
    doc.save()  # Version log của Frappe tự ghi audit
    return {"ok": True}
```

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: API admin tasks calendar/reschedule/reassign"`

## Task 4.5: Field API (mobile) — việc hôm nay, hoàn thành, báo cáo (bắt buộc ảnh), idempotent

**Files:** Create `api/field_api.py`; Create `tests/test_api_field.py`

- [ ] **Step 1: Test thất bại**
```python
import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import field_api


class TestFieldApi(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z FLD"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z FLD", "area": 40000}).insert()
        if not frappe.db.exists("Farm Block", "B FLD"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B FLD", "zone": "Z FLD", "area": 10000}).insert()
        self.t = frappe.get_doc({"doctype": "Farm Task", "title": "Tưới", "block": "B FLD", "crop": "Gấc",
                                 "task_date": "2026-06-14", "status": "pending", "require_photo": 0}).insert()

    def test_complete_task(self):
        field_api.complete_task(self.t.name, client_uuid="u1")
        self.assertEqual(frappe.db.get_value("Farm Task", self.t.name, "status"), "completed")

    def test_complete_requires_photo_when_flagged(self):
        self.t.require_photo = 1
        self.t.save()
        with self.assertRaises(frappe.ValidationError):
            field_api.complete_task(self.t.name, client_uuid="u2", photos=[])

    def test_daily_report_idempotent(self):
        field_api.submit_report(block="B FLD", crop="Gấc", date="2026-06-14",
                                content="ok", photos=["/files/a.jpg"], client_uuid="r1")
        field_api.submit_report(block="B FLD", crop="Gấc", date="2026-06-14",
                                content="ok", photos=["/files/a.jpg"], client_uuid="r1")
        self.assertEqual(frappe.db.count("Team Leader Report", {"client_uuid": "r1"}), 1)
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai** — Create `api/field_api.py`:
```python
import frappe
import json


@frappe.whitelist()
def today_tasks(date=None):
    from frappe.utils import getdate
    d = str(getdate(date)) if date else str(getdate())
    return frappe.get_all("Farm Task",
        filters={"team_leader": frappe.session.user, "task_date": d},
        fields=["name as id", "title", "block as plotId", "crop", "task_date as date",
                "status", "require_photo as requirePhoto", "priority"])


@frappe.whitelist()
def complete_task(task, client_uuid=None, photos=None):
    photos = photos if isinstance(photos, list) else (json.loads(photos) if photos else [])
    doc = frappe.get_doc("Farm Task", task)
    if doc.require_photo and not photos:
        frappe.throw("Việc này bắt buộc đính kèm ảnh")
    if client_uuid and doc.client_uuid == client_uuid and doc.status == "completed":
        return {"ok": True}  # idempotent
    doc.status = "completed"
    doc.client_uuid = client_uuid
    doc.set("photos", [{"image": p} for p in photos])
    doc.save()
    return {"ok": True}


@frappe.whitelist()
def submit_report(block, crop, date, content, photos=None, abnormal=0, client_uuid=None):
    photos = photos if isinstance(photos, list) else (json.loads(photos) if photos else [])
    if client_uuid and frappe.db.exists("Team Leader Report", {"client_uuid": client_uuid}):
        return {"ok": True}  # idempotent chống gửi trùng offline
    if abnormal and not photos:
        frappe.throw("Báo cáo bất thường bắt buộc ảnh")
    doc = frappe.get_doc({"doctype": "Team Leader Report", "team_leader": frappe.session.user,
        "block": block, "crop": crop, "report_date": date, "content": content,
        "abnormal": abnormal, "client_uuid": client_uuid,
        "photos": [{"image": p} for p in photos]}).insert()
    return {"ok": True, "name": doc.name}
```

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: API field today/complete/report idempotent + bat buoc anh"`

## Task 4.6: Nhập quy trình từ file sheet

**Files:** Create `api/sheet_import.py`; Create `tests/test_sheet_import.py`; Create mẫu `docs/mau-quy-trinh.xlsx`

- [ ] **Step 1: Test thất bại**
```python
import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api.sheet_import import import_rows


class TestSheetImport(FrappeTestCase):
    def test_import_creates_process(self):
        rows = [
            {"Bước": 1, "Mô tả": "Chuẩn bị đất", "Công/ha": 10, "Tần suất": "1 lần/chu kỳ", "Phạm vi": "Dùng chung"},
            {"Bước": 2, "Mô tả": "Tưới nước", "Công/ha": 2, "Tần suất": "2 ngày/lần", "Phạm vi": "Theo cây"},
        ]
        name = import_rows("Quy trình Sâm IMP", "Sâm", rows)
        self.assertEqual(len(frappe.get_doc("Cultivation Process", name).steps), 2)
```

- [ ] **Step 2: Chạy test → fail.**

- [ ] **Step 3: Triển khai** — Create `api/sheet_import.py`:
```python
import frappe
from akf_farm.engine.frequency import parse_frequency

SCOPE_MAP = {"dùng chung": "shared", "toàn bộ lô": "shared", "theo cây": "per_crop"}


def import_rows(process_name, crop, rows):
    steps = []
    for i, r in enumerate(rows, 1):
        ftype, fval = parse_frequency(str(r.get("Tần suất", "")))
        scope = SCOPE_MAP.get(str(r.get("Phạm vi", "")).strip().lower(), "per_crop")
        steps.append({"step": r.get("Bước", i), "description": r["Mô tả"],
                      "mandays_per_ha": r.get("Công/ha", 0), "frequency_type": ftype,
                      "frequency_value": fval, "scope": scope})
    doc = frappe.get_doc({"doctype": "Cultivation Process", "process_name": process_name,
                          "crop": crop, "steps": steps}).insert()
    return doc.name


@frappe.whitelist()
def import_file(process_name, crop, file_url):
    import openpyxl
    path = frappe.get_site_path(file_url.lstrip("/"))
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    headers = [c.value for c in ws[1]]
    rows = [dict(zip(headers, [c.value for c in row])) for row in ws.iter_rows(min_row=2)]
    return import_rows(process_name, crop, rows)
```

- [ ] **Step 4: Chạy test → pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat: API import quy trinh tu sheet"`

---

# GÓI 5 — Seed dữ liệu mẫu

## Task 5.1: Script seed

**Files:** Create `akf_farm/seed.py`

- [ ] **Step 1: Viết seed** — Create `akf_farm/seed.py` (dựng 2 zone, 4 block, 2 tổ trưởng User, vài tổ viên, quy trình Gấc+Sâm, crop cycle cho mỗi block):
```python
import frappe


def run():
    if not frappe.db.exists("Farm Zone", "Vùng A"):
        frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Vùng A", "area": 50000, "status": "good"}).insert()
    if not frappe.db.exists("Farm Zone", "Vùng B"):
        frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Vùng B", "area": 45000, "status": "warning"}).insert()
    # Tổ trưởng = User + role
    for email, name, phone in [("vana@akf.local", "Nguyễn Văn A", "0901234567"),
                               ("thib@akf.local", "Trần Thị B", "0902345678")]:
        if not frappe.db.exists("User", email):
            u = frappe.get_doc({"doctype": "User", "email": email, "first_name": name,
                                "username": phone, "new_password": "akf12345",
                                "roles": [{"role": "AKF Team Leader"}]}).insert()
    blocks = [("Lô A1", "Vùng A", "vana@akf.local"), ("Lô A2", "Vùng A", "vana@akf.local"),
              ("Lô B1", "Vùng B", "thib@akf.local"), ("Lô B2", "Vùng B", "thib@akf.local")]
    for bn, zn, tl in blocks:
        if not frappe.db.exists("Farm Block", bn):
            frappe.get_doc({"doctype": "Farm Block", "block_name": bn, "zone": zn,
                            "area": 12500, "team_leader": tl, "status": "good"}).insert()
    # Quy trình + cycle
    if not frappe.db.exists("Cultivation Process", "Quy trình Gấc"):
        frappe.get_doc({"doctype": "Cultivation Process", "process_name": "Quy trình Gấc", "crop": "Gấc",
            "steps": [{"step": 1, "description": "Tưới nước giàn gấc", "mandays_per_ha": 2,
                       "frequency_type": "every_n_days", "frequency_value": 2, "scope": "per_crop"}]}).insert()
    for bn, zn, tl in blocks:
        if not frappe.db.exists("Crop Cycle", {"block": bn, "crop": "Gấc"}):
            frappe.get_doc({"doctype": "Crop Cycle", "block": bn, "crop": "Gấc",
                            "process": "Quy trình Gấc", "start_date": "2026-06-14", "status": "active"}).insert()
    frappe.db.commit()
```

- [ ] **Step 2: Chạy seed + sinh việc**

Run:
```bash
bench --site akf.localhost execute akf_farm.seed.run
bench --site akf.localhost execute akf_farm.engine.task_generator.generate_tasks --kwargs "{'from_date':'2026-06-14','days':10}"
```
Expected: tạo zone/block/user/cycle + một số Farm Task.

- [ ] **Step 3: Commit** — `git commit -m "feat: seed du lieu mau"`

---

# GÓI 6 — Tích hợp frontend (đổi mockData → API)

> Nối React với backend. Same-origin: dev dùng Vite proxy. Mỗi domain đổi sang gọi API + loading/error.

## Task 6.1: Fetch wrapper + Vite proxy

**Files:** Create `web/src/lib/api.ts`; Modify `web/vite.config.ts`

- [ ] **Step 1: Viết wrapper** — Create `web/src/lib/api.ts`:
```ts
const BASE = "/api/method/akf_farm.api";

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}.${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": (window as any).csrf_token || "" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    window.location.href = "/";
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  const json = await res.json();
  return json.message as T; // Frappe bọc kết quả trong .message
}

export const api = { call };
```

- [ ] **Step 2: Thêm Vite proxy** — Modify `web/vite.config.ts`, thêm vào `defineConfig({ server: { proxy: ... } })`:
```ts
server: {
  proxy: {
    "/api": { target: "http://akf.localhost:8000", changeOrigin: true },
    "/files": { target: "http://akf.localhost:8000", changeOrigin: true },
  },
},
```

- [ ] **Step 3: Build kiểm tra** — Run: `cd web && npm run build`. Expected: build OK (chưa dùng tới `api` ở đâu nên không lỗi runtime).
- [ ] **Step 4: Commit** — `git commit -m "feat(web): api fetch wrapper + vite proxy"`

## Task 6.2: AuthContext + route guard + nối 2 form login

**Files:** Create `web/src/lib/auth.tsx`, `web/src/components/RequireAuth.tsx`; Modify `web/src/routes.tsx`, `AdminLogin.tsx`, `MobileLogin.tsx`

- [ ] **Step 1: AuthContext** — Create `web/src/lib/auth.tsx`:
```tsx
import React from "react";
import { api } from "./api";

type User = { email: string; full_name: string; role: "admin" | "team_leader" } | null;
const Ctx = React.createContext<{ user: User; login: (u: string, p: string) => Promise<User>; logout: () => Promise<void>; loading: boolean }>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User>(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    api.call<User>("auth_api.me").then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  const login = async (usr: string, pwd: string) => {
    const u = await api.call<User>("auth_api.login", { usr, pwd });
    setUser(u); return u;
  };
  const logout = async () => { await api.call("auth_api.logout", {}); setUser(null); };
  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>;
}
export const useAuth = () => React.useContext(Ctx);
```

- [ ] **Step 2: Route guard** — Create `web/src/components/RequireAuth.tsx`:
```tsx
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../lib/auth";

export function RequireAuth({ role }: { role?: "admin" | "team_leader" }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-gray-400">Đang tải…</div>;
  if (!user) return <Navigate to={role === "team_leader" ? "/mobile/login" : "/"} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
```

- [ ] **Step 3: Bọc router + guard** — Modify `web/src/main.tsx` bọc `<AuthProvider>`; Modify `routes.tsx` cho `/admin` và `/mobile` là con của `<RequireAuth role=...>` (chèn route element guard bao quanh layout).

- [ ] **Step 4: Nối form login** — Modify `AdminLogin.tsx` & `MobileLogin.tsx`: thay `<Link>` bằng `onSubmit` gọi `useAuth().login(usr,pwd)` rồi `navigate("/admin")` / `navigate("/mobile/tasks")`; hiện lỗi khi sai.

- [ ] **Step 5: Kiểm thử thủ công + commit** — chạy `npm run dev`, đăng nhập admin (Administrator/admin) → vào /admin; sai mật khẩu → báo lỗi; chưa đăng nhập gõ /admin → đẩy về /. Commit — `git commit -m "feat(web): auth context + route guard + login that"`

## Task 6.3: Đổi HeatMap + ZoneManagement sang API (không đụng logic trộn màu)

**Files:** Create `web/src/lib/queries.ts`; Modify `web/src/components/admin/HeatMap.tsx`, `ZoneManagement.tsx`

- [ ] **Step 1: Query helpers** — Create `web/src/lib/queries.ts`:
```ts
import { api } from "./api";
export const getHeatmap = () => api.call<{ zones: any[]; plots: any[] }>("admin_api.heatmap");
export const getZones = () => api.call<any[]>("admin_api.list_zones");
export const getCalendar = (from: string, days = 10) =>
  api.call<any[]>(`admin_api.calendar?from_date=${from}&days=${days}`);
```

- [ ] **Step 2: HeatMap dùng API** — Modify `HeatMap.tsx`: bỏ `import { plots, zones } from mockData`, thay bằng state nạp từ `getHeatmap()` trong `useEffect`; **GIỮ NGUYÊN** `mixColors`/`plotHeatColor`/`STATUS` và toàn bộ phần Leaflet. Giữ `zoneGeo/plotGeo/farmCenter` tạm từ mockData (toạ độ hình học) — đánh dấu TODO chuyển sang `boundary` GeoJSON ở task sau. Thêm loading state.

- [ ] **Step 3: ZoneManagement dùng API** — Modify `ZoneManagement.tsx`: nạp `getZones()`/`list_plots`; loading/error.

- [ ] **Step 4: Kiểm thử thủ công** — `npm run dev`, mở /admin/heatmap: bản đồ tô màu từ dữ liệu seed; lô có 2 cây trạng thái khác nhau hiển thị màu trộn theo `total`.

- [ ] **Step 5: Commit** — `git commit -m "feat(web): heatmap + zones doc API, giu logic tron mau"`

## Task 6.4: Đổi các màn còn lại sang API (theo nhóm)

**Files:** Modify các file còn import mockData: `Dashboard.tsx`, `WorkCalendar.tsx`, `ProcessManagement.tsx`, `CropCycleManagement.tsx`, `TeamManagement.tsx`, `TeamLeaderKPI.tsx`, `TeamLeaderReports.tsx`, `SupportRequests.tsx`, `Notifications.tsx`, `AnomalyDetail.tsx`, `Settings.tsx`, `PlotForm.tsx` và các màn `mobile/*`.

> Làm theo nhóm domain, mỗi nhóm 1 commit. Với mỗi màn: thêm endpoint admin/field tương ứng (nếu chưa có) ở Gói 4, thêm hàm trong `queries.ts`, thay import mockData bằng fetch + loading/error. Endpoint bổ sung viết kèm test như mẫu Task 4.3/4.5.

- [ ] **Step 1: Nhóm Dashboard + Calendar** — endpoints `admin_api.dashboard()`, `admin_api.calendar()`; sửa 2 màn; commit `feat(web): dashboard + calendar API`.
- [ ] **Step 2: Nhóm Process + CropCycle** — endpoints list/CRUD process & cycle; sửa 2 màn; commit `feat(web): process + crop cycle API`.
- [ ] **Step 3: Nhóm Team + KPI** — endpoints list team leaders/members + `leader_kpi` wrapper; sửa 2 màn; commit `feat(web): team + kpi API`.
- [ ] **Step 4: Nhóm Reports + Support + Notifications + Anomaly** — endpoints list/reply; sửa 4 màn; commit `feat(web): reports/support/notifications API`.
- [ ] **Step 5: Nhóm Mobile (today/upcoming/detail/report/history/support/account)** — dùng `field_api.*`; sửa các màn mobile + offline queue gọi `complete_task`/`submit_report` kèm `client_uuid`; commit `feat(web): mobile screens API + offline sync`.
- [ ] **Step 6: Gỡ mockData** — khi không còn import: xóa `web/src/lib/mockData.ts` (giữ phần `zoneGeo/plotGeo` nếu còn dùng, tách ra `geo.ts`); `grep -r mockData web/src` rỗng; commit `chore(web): go mockData sau khi noi API`.

---

# GÓI 7 — Triển khai same-origin + nghiệm thu

## Task 7.1: nginx same-origin + docker-compose gộp

**Files:** Modify `web/nginx.conf`, `docker-compose.yml`

- [ ] **Step 1: nginx proxy** — Modify `web/nginx.conf`: giữ SPA fallback cho `/`; thêm proxy `/api`, `/files`, `/assets` → service Frappe:
```nginx
location /api  { proxy_pass http://akf-frappe:8000; proxy_set_header Host $host; proxy_set_header Cookie $http_cookie; }
location /files { proxy_pass http://akf-frappe:8000; }
location /assets { proxy_pass http://akf-frappe:8000; }
```

- [ ] **Step 2: compose gộp** — Modify `docker-compose.yml`: thêm services frappe (mariadb, redis-cache, redis-queue, frappe backend+scheduler) theo frappe_docker; service `web` (nginx) phụ thuộc `akf-frappe`. Tài liệu hoá lệnh `docker compose up -d --build`.

- [ ] **Step 3: Kiểm thử thủ công** — `docker compose up -d --build`; mở `http://localhost:8080`, đăng nhập, kiểm tra `/api` chạy qua nginx (không CORS), ảnh `/files` hiển thị.

- [ ] **Step 4: Commit** — `git commit -m "feat: deploy same-origin nginx proxy + compose gop frappe"`

## Task 7.2: Kịch bản nghiệm thu end-to-end + tài liệu HDSD

**Files:** Create `docs/nghiem-thu-gd1.md`, `docs/huong-dan-su-dung.md`

- [ ] **Step 1: Chạy trọn vòng** theo Mục 11 spec: seed → sinh việc 10 ngày → tự gán tổ trưởng → đăng nhập mobile hoàn thành việc + báo cáo kèm ảnh (thử offline) → bản đồ nhiệt tô đúng (trộn màu theo tỷ lệ) → KPI → cảnh báo quá hạn (không tự đổi lịch) → admin lùi lịch 1 cây, cây kia không đổi → kiểm tra tổ trưởng A không thấy dữ liệu tổ B.
- [ ] **Step 2: Ghi `docs/nghiem-thu-gd1.md`** (checklist tick từng tiêu chí) + `docs/huong-dan-su-dung.md` (admin + tổ trưởng, tiếng Việt).
- [ ] **Step 3: Chạy toàn bộ test** — `bench --site akf.localhost run-tests --app akf_farm`. Expected: tất cả pass.
- [ ] **Step 4: Commit** — `git commit -m "docs: nghiem thu GD1 + huong dan su dung"`

---

## Self-review (đối chiếu spec 2026-06-16)

- **§1 Kiến trúc same-origin:** Gói 0 (docker), Gói 6.1 (vite proxy), Gói 7.1 (nginx). ✔
- **§2 DocTypes:** Gói 1 (1.1–1.7) phủ toàn bộ bảng + User/Role (Gói 3). ✔
- **§3 Engines:** frequency (2.1), compute_mandays (2.2), due_dates (2.3), dedupe_shared (2.4), generate 10 ngày idempotent (2.5), balancer (2.6), status (2.7), kpi (2.8). ✔
- **§3 Heatmap (backend chỉ trả crops[], trộn màu ở FE):** test contract 2.7 + giữ logic FE ở 6.3. ✔
- **§4 API:** auth (4.1), serializers (4.2), admin zones/plots/heatmap (4.3), tasks calendar/reschedule/reassign (4.4), field complete/report bắt buộc ảnh + idempotent (4.5), sheet import (4.6); CRUD còn lại bổ sung theo màn ở 6.4. ✔
- **§5 Auth & phân quyền:** roles + permission query (3.1), login that + guard (6.2). ✔
- **§6 Offline idempotent:** client_uuid ở DocTypes (1.5,1.6), API (4.5), mobile (6.4 step 5). ✔
- **§7 Tích hợp frontend:** api.ts (6.1), auth (6.2), đổi 23 file (6.3, 6.4), gỡ mockData (6.4 step 6). ✔
- **§8 Triển khai & test:** compose (7.1), run-tests (7.2), seed (5.1). ✔
- **§9 Bỏ trang Frappe lịch/bản đồ/PWA:** không có task nào tạo chúng — dùng React. ✔
- **§11 Acceptance:** kịch bản end-to-end (7.2). ✔
- **Type consistency:** `due_dates`, `dedupe_shared`, `compute_mandays`, `generate_tasks`, `crop_status`, `rollup_status`, `compute_kpi`, `serialize_plot`, `assign_leaders`, `farm_task_query` — tên dùng nhất quán giữa định nghĩa và nơi gọi. ✔
- **Còn mở (không chặn):** toạ độ hình học bản đồ tạm giữ từ FE (`zoneGeo/plotGeo`), TODO chuyển sang `boundary` GeoJSON đánh dấu ở 6.3 step 2; CRUD endpoint chi tiết mở rộng theo từng màn ở 6.4 (YAGNI).
