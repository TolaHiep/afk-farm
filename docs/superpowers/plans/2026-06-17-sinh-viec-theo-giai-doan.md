# Sinh việc theo giai đoạn + offset từng bước — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Việc bảo trì (tưới, tỉa, kiểm tra) chỉ sinh sau khi nhóm việc setup đầu chu kỳ hoàn thành; mỗi bước có thể khai báo offset (số ngày sau ngày gieo) để đè lên logic giai đoạn.

**Architecture:** Thêm `offset_days` (Int, default -1) cho Cultivation Step và `setup_done_on` (Date) cho Crop Cycle. `generate_tasks` neo mỗi bước theo 3 mức ưu tiên (offset ≥ 0 → start+offset; auto + setup → start; auto + bảo trì → setup_done_on, bỏ qua nếu chưa xong). `complete_task` đánh dấu setup xong + sinh việc bảo trì ngay. Frontend + Excel thêm trường offset.

**Tech Stack:** Frappe v15 / Python (engine + API); openpyxl (Excel); React 18 + TS (frontend).

## Global Constraints

- `offset_days`: **default -1 = tự động** (theo giai đoạn); `0` = đúng ngày gieo; `> 0` = số ngày sau. Ô trống ở UI/Excel → -1. Bước cũ sau migrate nhận -1 (giữ hành vi giai đoạn, không dồn ngày 1).
- Chữ tiếng Việt giữ đúng dấu (UTF-8): nhãn cột, "Gấc"/"Sâm", chuỗi UI.
- Sửa DocType `.json` → BẮT BUỘC `bench migrate` trước khi test.
- `generate_tasks` vẫn idempotent (khóa theo block+crop+ngày+title), cuốn chiếu 10 ngày.
- Frappe Int field mặc định 0 — KHÔNG dùng 0 làm "auto"; phải dùng default -1 trong json.
- Test backend (Frappe): `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module <mod>'` (set-config allow_tests true nếu cần).
- Test thuần (host): `cd backend/akf_farm && python -m pytest akf_farm/engine/test_task_generator.py -q`.
- Frontend verify (host): `cd frontend && npx tsc --noEmit 2>&1 | grep -E "ProcessManagement"` (kỳ vọng rỗng; ~11 lỗi cũ ở file khác — bỏ qua).
- Commit ASCII, không ký tự `"` trong message. Backend bind-mount live; hooks không đổi nên không cần restart.

---

## File Structure

**Backend**
- `.../doctype/cultivation_step/cultivation_step.json` — thêm `offset_days`. (Modify)
- `.../doctype/crop_cycle/crop_cycle.json` — thêm `setup_done_on`. (Modify)
- `akf_farm/engine/task_generator.py` — `setup_step_indices`, `_setup_complete`, `stamp_setup_if_done`, sửa `generate_tasks`. (Modify)
- `akf_farm/engine/test_task_generator.py` — test thuần `setup_step_indices`. (Modify)
- `akf_farm/engine/test_phased_generation.py` — FrappeTestCase: fields + generate + complete + API offset. (Create)
- `akf_farm/api/field_api.py` — `complete_task` gọi stamp + generate khi setup vừa xong. (Modify)
- `akf_farm/api/admin_api.py` — `_apply_steps` + `list_processes` xử lý `offset_days`; helper `_norm_offset`. (Modify)
- `akf_farm/api/sheet_import.py` — mẫu + import cột "Bắt đầu sau (ngày)". (Modify)
- `akf_farm/api/test_sheet_import.py` — test cột offset. (Modify)

**Frontend**
- `frontend/src/components/admin/ProcessManagement.tsx` — Step.offsetDays + form + bảng. (Modify)

---

## Task 1: Doctype fields + migrate

**Files:**
- Modify: `backend/akf_farm/akf_farm/akf_farm/doctype/cultivation_step/cultivation_step.json`
- Modify: `backend/akf_farm/akf_farm/akf_farm/doctype/crop_cycle/crop_cycle.json`
- Create: `backend/akf_farm/akf_farm/engine/test_phased_generation.py`

**Interfaces:**
- Produces: `Cultivation Step.offset_days` (Int, default -1); `Crop Cycle.setup_done_on` (Date, read-only).

- [ ] **Step 1: Viết test thất bại — `engine/test_phased_generation.py`**

```python
import frappe
from frappe.tests.utils import FrappeTestCase


class TestPhasedFields(FrappeTestCase):
    def test_step_offset_default_minus_one(self):
        if frappe.db.exists("Cultivation Process", "QT FIELD"):
            frappe.delete_doc("Cultivation Process", "QT FIELD", force=True)
        p = frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "QT FIELD", "crop": "Gấc",
            "steps": [{"step": 1, "description": "X", "frequency_type": "one_time"}],
        }).insert()
        self.assertEqual(p.steps[0].offset_days, -1)

    def test_crop_cycle_has_setup_done_on(self):
        self.assertTrue(frappe.get_meta("Crop Cycle").has_field("setup_done_on"))
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — field chưa tồn tại (offset_days mặc định 0/None hoặc has_field False).

- [ ] **Step 3: Thêm field vào `cultivation_step.json`**

Trong `field_order`, thêm `"offset_days"` sau `"require_photo"`. Trong `fields`, thêm object (sau object `require_photo`):

```json
  {
   "default": "-1",
   "fieldname": "offset_days",
   "fieldtype": "Int",
   "label": "Bắt đầu sau khi gieo (ngày)"
  }
```

- [ ] **Step 4: Thêm field vào `crop_cycle.json`**

Trong `field_order`, thêm `"setup_done_on"` sau `"status"`. Trong `fields`, thêm:

```json
  {
   "fieldname": "setup_done_on",
   "fieldtype": "Date",
   "label": "Ngày setup hoàn tất",
   "read_only": 1
  }
```

- [ ] **Step 5: Migrate**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost migrate'`
Expected: migrate xong; cột `offset_days` (default -1) thêm vào Cultivation Step, `setup_done_on` vào Crop Cycle.

- [ ] **Step 6: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: PASS (2 test).

- [ ] **Step 7: Commit**

```bash
git add backend/akf_farm/akf_farm/akf_farm/doctype/cultivation_step/cultivation_step.json backend/akf_farm/akf_farm/akf_farm/doctype/crop_cycle/crop_cycle.json backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: them offset_days (Cultivation Step) va setup_done_on (Crop Cycle)"
```

---

## Task 2: Hàm thuần `setup_step_indices`

**Files:**
- Modify: `backend/akf_farm/akf_farm/engine/task_generator.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_task_generator.py`

**Interfaces:**
- Produces: `setup_step_indices(steps) -> set[int]`. `steps` = list các tuple `(frequency_type, offset_days)`. Trả tập index thuộc khối setup: bước one_time + auto(offset<0) liên tiếp từ đầu; bước offset>=0 trong suốt (bỏ qua, không tính, không phá chuỗi); dừng ở bước định kỳ auto đầu tiên.

- [ ] **Step 1: Viết test thất bại — thêm vào `engine/test_task_generator.py`**

```python
from akf_farm.engine.task_generator import setup_step_indices


class TestSetupStepIndices(unittest.TestCase):
    def test_leading_one_time_block(self):
        steps = [("one_time", -1), ("one_time", -1), ("every_n_days", -1), ("daily", -1)]
        self.assertEqual(setup_step_indices(steps), {0, 1})

    def test_offset_step_is_transparent(self):
        # bước có offset (idx1) bị bỏ qua nhưng không phá chuỗi setup
        steps = [("one_time", -1), ("one_time", 5), ("one_time", -1), ("daily", -1)]
        self.assertEqual(setup_step_indices(steps), {0, 2})

    def test_no_leading_one_time(self):
        self.assertEqual(setup_step_indices([("daily", -1), ("one_time", -1)]), set())

    def test_empty(self):
        self.assertEqual(setup_step_indices([]), set())
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd backend/akf_farm && python -m pytest akf_farm/engine/test_task_generator.py -k SetupStepIndices -q`
Expected: FAIL — `setup_step_indices` chưa tồn tại.

- [ ] **Step 3: Thêm `setup_step_indices` vào đầu `task_generator.py`** (sau `import datetime as dt`)

```python
def setup_step_indices(steps):
    """steps: list (frequency_type, offset_days). Trả set index thuộc khối setup:
    bước one_time + auto (offset<0) liên tiếp từ đầu; bước offset>=0 trong suốt (bỏ qua,
    không phá chuỗi); dừng ở bước định kỳ auto đầu tiên."""
    out = set()
    for i, (ftype, offset) in enumerate(steps):
        if offset is not None and offset >= 0:
            continue
        if ftype == "one_time":
            out.add(i)
        else:
            break
    return out
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd backend/akf_farm && python -m pytest akf_farm/engine/test_task_generator.py -k SetupStepIndices -q`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/engine/task_generator.py backend/akf_farm/akf_farm/engine/test_task_generator.py
git commit -m "feat: setup_step_indices xac dinh khoi viec setup dau chu ky"
```

---

## Task 3: `generate_tasks` neo theo giai đoạn + offset

**Files:**
- Modify: `backend/akf_farm/akf_farm/engine/task_generator.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py`

**Interfaces:**
- Consumes: `setup_step_indices`, `due_dates`.
- Produces: `_setup_complete(cycle_name, setup_descs) -> bool`; `stamp_setup_if_done(cycle_name) -> date|None` (set `setup_done_on` nếu setup xong, KHÔNG tự gọi generate_tasks); `generate_tasks` neo mỗi bước theo 3 mức ưu tiên.

- [ ] **Step 1: Viết test thất bại — thêm vào `engine/test_phased_generation.py`**

```python
from frappe.utils import getdate, add_days
from akf_farm.engine.task_generator import generate_tasks


def _proc(name, steps):
    if frappe.db.exists("Cultivation Process", name):
        frappe.delete_doc("Cultivation Process", name, force=True)
    frappe.get_doc({"doctype": "Cultivation Process", "process_name": name, "crop": "Gấc", "steps": steps}).insert()


def _block(name):
    if not frappe.db.exists("Farm Zone", "Z PH"):
        frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z PH", "area": 10000}).insert()
    if not frappe.db.exists("Farm Block", name):
        frappe.get_doc({"doctype": "Farm Block", "block_name": name, "zone": "Z PH", "area": 10000}).insert()


def _cycle(block, process):
    return frappe.get_doc({"doctype": "Crop Cycle", "block": block, "crop": "Gấc",
                           "cultivation_process": process, "start_date": str(getdate()),
                           "status": "active"}).insert().name


def _has_task(cycle, title, date):
    return bool(frappe.db.exists("Farm Task", {"cycle": cycle, "title": title, "task_date": str(date)}))


class TestPhasedGeneration(FrappeTestCase):
    def test_maintenance_gated_until_setup_done(self):
        _proc("QT GATE", [
            {"step": 1, "description": "Gieo GATE", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Tưới GATE", "frequency_type": "daily", "scope": "per_crop"},
        ])
        _block("B GATE")
        name = _cycle("B GATE", "QT GATE")  # hook after_insert -> generate
        today = getdate()
        self.assertTrue(_has_task(name, "Gieo GATE", today))      # setup có
        self.assertFalse(_has_task(name, "Tưới GATE", today))      # bảo trì chưa
        # hoàn thành việc setup
        gieo = frappe.get_all("Farm Task", filters={"cycle": name, "title": "Gieo GATE"})[0].name
        frappe.db.set_value("Farm Task", gieo, "status", "completed")
        generate_tasks()
        self.assertTrue(frappe.db.get_value("Crop Cycle", name, "setup_done_on"))
        self.assertTrue(_has_task(name, "Tưới GATE", today))       # bảo trì sinh từ hôm nay

    def test_offset_step_anchored_start_plus_offset(self):
        _proc("QT OFF", [
            {"step": 1, "description": "Gieo OFF", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Bón OFF", "frequency_type": "daily", "scope": "per_crop", "offset_days": 3},
        ])
        _block("B OFF")
        name = _cycle("B OFF", "QT OFF")
        today = getdate()
        # offset=3 -> không có ngày hôm nay, có ngày +3 (bất kể setup)
        self.assertFalse(_has_task(name, "Bón OFF", today))
        self.assertTrue(_has_task(name, "Bón OFF", add_days(today, 3)))

    def test_empty_setup_maintenance_from_start(self):
        _proc("QT NOSETUP", [
            {"step": 1, "description": "Tưới NOSETUP", "frequency_type": "daily", "scope": "per_crop"},
        ])
        _block("B NOSETUP")
        name = _cycle("B NOSETUP", "QT NOSETUP")
        self.assertTrue(_has_task(name, "Tưới NOSETUP", getdate()))  # bảo trì từ ngày gieo
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — `generate_tasks` chưa neo theo giai đoạn (hiện neo tất cả vào start_date nên "Tưới GATE" có ngay hôm nay).

- [ ] **Step 3: Thêm helper + sửa `generate_tasks` trong `task_generator.py`**

Thêm 2 helper (sau `setup_step_indices`):

```python
def _setup_complete(cycle_name, setup_descs):
    """Mọi việc setup của cycle (theo title=description) đã completed?"""
    import frappe

    for desc in setup_descs:
        t = frappe.get_all("Farm Task", filters={"cycle": cycle_name, "title": desc},
                           fields=["status"], limit=1)
        if not t or t[0].status != "completed":
            return False
    return True


def stamp_setup_if_done(cycle_name):
    """Nếu setup của cycle đã xong mà chưa đánh dấu -> set setup_done_on (KHÔNG gọi generate_tasks).
    Trả setup_done_on (date) hoặc None."""
    import frappe
    from frappe.utils import getdate

    cyc = frappe.db.get_value("Crop Cycle", cycle_name,
                              ["cultivation_process", "setup_done_on", "start_date"], as_dict=True)
    if not cyc:
        return None
    if cyc.setup_done_on:
        return getdate(cyc.setup_done_on)
    if not cyc.cultivation_process:
        return None
    proc = frappe.get_doc("Cultivation Process", cyc.cultivation_process)
    steps = list(proc.steps)
    setup_descs = [steps[i].description for i in
                   setup_step_indices([(s.frequency_type, s.offset_days) for s in steps])]
    done = None
    if not setup_descs:
        done = getdate(cyc.start_date)
    elif _setup_complete(cycle_name, setup_descs):
        done = getdate()
    if done:
        frappe.db.set_value("Crop Cycle", cycle_name, "setup_done_on", str(done))
    return done
```

Sửa vòng lặp cycle trong `generate_tasks` — thay khối:

```python
        proc = frappe.get_doc("Cultivation Process", c.cultivation_process)
        for s in proc.steps:
            freq = (s.frequency_type, s.frequency_value) if s.frequency_type else ("one_time", 1)
            for d in due_dates(getdate(c.start_date), freq, from_d, to_d):
                rows.append({
                    "cycle": c.name, "block": c.block, "crop": c.crop, "date": d,
                    "description": s.description, "scope": s.scope, "require_photo": s.require_photo,
                    "mandays": compute_mandays(s.mandays_per_ha, area_of[c.block]),
                })
```

bằng:

```python
        proc = frappe.get_doc("Cultivation Process", c.cultivation_process)
        steps = list(proc.steps)
        setup_idx = setup_step_indices([(s.frequency_type, s.offset_days) for s in steps])
        setup_done = stamp_setup_if_done(c.name)
        start = getdate(c.start_date)
        for i, s in enumerate(steps):
            freq = (s.frequency_type, s.frequency_value) if s.frequency_type else ("one_time", 1)
            offset = s.offset_days
            if offset is not None and offset >= 0:
                anchor = getdate(add_days(start, offset))
            elif i in setup_idx:
                anchor = start
            else:
                if not setup_done:
                    continue  # bảo trì auto: chưa xong setup -> chưa sinh
                anchor = setup_done
            for d in due_dates(anchor, freq, from_d, to_d):
                rows.append({
                    "cycle": c.name, "block": c.block, "crop": c.crop, "date": d,
                    "description": s.description, "scope": s.scope, "require_photo": s.require_photo,
                    "mandays": compute_mandays(s.mandays_per_ha, area_of[c.block]),
                })
```

(Lưu ý: `add_days`, `getdate` đã import sẵn đầu `generate_tasks`.)

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: PASS (gồm 3 test mới + 2 test field).

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/engine/task_generator.py backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: generate_tasks neo theo giai doan setup + offset tung buoc"
```

---

## Task 4: `complete_task` đánh dấu setup xong + sinh bảo trì ngay

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/field_api.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py`

**Interfaces:**
- Consumes: `stamp_setup_if_done`, `generate_tasks`.
- Produces: `complete_task` — sau khi hoàn thành 1 việc, nếu setup của cycle vừa đủ (trước đó chưa đánh dấu) → set `setup_done_on` + `generate_tasks()`.

- [ ] **Step 1: Viết test thất bại — thêm vào `engine/test_phased_generation.py`**

```python
from akf_farm.api import field_api


class TestCompleteTaskFinishesSetup(FrappeTestCase):
    def test_completing_last_setup_task_spawns_maintenance(self):
        _proc("QT CT", [
            {"step": 1, "description": "Gieo CT", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Tưới CT", "frequency_type": "daily", "scope": "per_crop"},
        ])
        _block("B CT")
        name = _cycle("B CT", "QT CT")
        today = getdate()
        self.assertFalse(_has_task(name, "Tưới CT", today))
        gieo = frappe.get_all("Farm Task", filters={"cycle": name, "title": "Gieo CT"})[0].name
        # đi qua API hoàn thành việc (không set_value tay)
        field_api.complete_task(gieo)
        self.assertTrue(frappe.db.get_value("Crop Cycle", name, "setup_done_on"))
        self.assertTrue(_has_task(name, "Tưới CT", today))
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — `complete_task` chưa kích hoạt sinh bảo trì (Tưới CT vẫn chưa có).

- [ ] **Step 3: Sửa `complete_task` trong `field_api.py`**

Thêm import ở đầu file (cạnh `import frappe`):

```python
from akf_farm.engine.task_generator import stamp_setup_if_done, generate_tasks
```

Trong `complete_task`, sau `doc.save()` và trước `return {"ok": True}`, thêm:

```python
    if doc.cycle:
        before = frappe.db.get_value("Crop Cycle", doc.cycle, "setup_done_on")
        done = stamp_setup_if_done(doc.cycle)
        if done and not before:
            generate_tasks()  # setup vừa xong -> sinh việc bảo trì ngay
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/field_api.py backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: complete_task danh dau setup xong va sinh viec bao tri ngay"
```

---

## Task 5: API `offset_days` (create/update + list process)

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/admin_api.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py`

**Interfaces:**
- Produces: `_norm_offset(v) -> int` (trống/None → -1; else int); `_apply_steps` lưu `offset_days`; `list_processes` trả `offsetDays` mỗi bước.

- [ ] **Step 1: Viết test thất bại — thêm vào `engine/test_phased_generation.py`**

```python
from akf_farm.api import admin_api


class TestProcessOffsetApi(FrappeTestCase):
    def test_create_and_list_offset(self):
        if frappe.db.exists("Cultivation Process", "QT API"):
            frappe.delete_doc("Cultivation Process", "QT API", force=True)
        admin_api.create_process(process_name="QT API", crop="Gấc", steps=[
            {"description": "Có offset", "frequencyType": "daily", "scopeRaw": "per_crop", "offsetDays": 5},
            {"description": "Không offset", "frequencyType": "daily", "scopeRaw": "per_crop"},
        ])
        doc = frappe.get_doc("Cultivation Process", "QT API")
        self.assertEqual(doc.steps[0].offset_days, 5)
        self.assertEqual(doc.steps[1].offset_days, -1)  # trống -> -1
        listed = [p for p in admin_api.list_processes() if p["id"] == "QT API"][0]
        self.assertEqual(listed["steps"][0]["offsetDays"], 5)
        self.assertEqual(listed["steps"][1]["offsetDays"], -1)
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — `offset_days` không được lưu (mặc định -1 cho cả hai) / `offsetDays` thiếu trong list.

- [ ] **Step 3: Thêm `_norm_offset` + sửa `_apply_steps` và `list_processes` trong `admin_api.py`**

Thêm helper (trên `_apply_steps`):

```python
def _norm_offset(v):
    if v is None or v == "":
        return -1
    try:
        return int(v)
    except (TypeError, ValueError):
        return -1
```

Trong `_apply_steps`, thêm vào dict `doc.append("steps", {...})`:

```python
            "offset_days": _norm_offset(s.get("offsetDays")),
```

Trong `list_processes`, thêm vào dict mỗi step:

```python
            "offsetDays": s.offset_days,
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/admin_api.py backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: API quy trinh luu va tra offset_days"
```

---

## Task 6: Excel — cột "Bắt đầu sau (ngày)"

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/sheet_import.py`
- Modify: `backend/akf_farm/akf_farm/api/test_sheet_import.py`

**Interfaces:**
- Consumes: `parse_workbook` (đọc header tổng quát — không đổi).
- Produces: `import_rows` lưu `offset_days` từ cột "Bắt đầu sau (ngày)" (trống → -1); `process_template` có cột thứ 7.

- [ ] **Step 1: Viết test thất bại — thêm vào `test_sheet_import.py`**

```python
class TestImportOffset(FrappeTestCase):
    def test_import_rows_offset(self):
        if frappe.db.exists("Cultivation Process", "QT OFFSET IMP"):
            frappe.delete_doc("Cultivation Process", "QT OFFSET IMP", force=True)
        rows = [
            {"Bước": 1, "Mô tả": "Có offset", "Tần suất": "Hàng ngày", "Phạm vi": "Theo cây", "Bắt đầu sau (ngày)": 7},
            {"Bước": 2, "Mô tả": "Trống", "Tần suất": "Hàng ngày", "Phạm vi": "Theo cây", "Bắt đầu sau (ngày)": ""},
        ]
        name = import_rows("QT OFFSET IMP", "Gấc", rows)
        doc = frappe.get_doc("Cultivation Process", name)
        self.assertEqual(doc.steps[0].offset_days, 7)
        self.assertEqual(doc.steps[1].offset_days, -1)

    def test_template_has_offset_column(self):
        import io
        sheet_import.process_template()
        wb = openpyxl.load_workbook(io.BytesIO(frappe.response.get("filecontent")))
        ws = wb.active
        self.assertEqual(ws.cell(row=4, column=7).value, "Bắt đầu sau (ngày)")
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'`
Expected: FAIL — `offset_days` không đọc từ cột; template chưa có cột 7.

- [ ] **Step 3: Sửa `import_rows` + `process_template` trong `sheet_import.py`**

Thêm helper (cạnh `_truthy`):

```python
def _offset(v):
    if v is None or str(v).strip() == "":
        return -1
    try:
        return int(float(str(v).strip()))
    except ValueError:
        return -1
```

Trong `import_rows`, thêm vào `steps.append({...})`:

```python
            "offset_days": _offset(r.get("Bắt đầu sau (ngày)", "")),
```

Trong `process_template`: đổi `header` thành 7 cột và thêm giá trị offset mẫu vào `samples`:

```python
    header = ["Bước", "Mô tả", "Công/ha", "Tần suất", "Phạm vi", "Yêu cầu ảnh", "Bắt đầu sau (ngày)"]
    ...
    samples = [
        [1, "Đào hố trồng 60x60cm", 2, "1 lần/20 năm", "Theo cây", "", ""],
        [2, "Bón phân nước định kỳ", 2, "60 ngày/lần", "Theo cây", "", ""],
        [3, "Tưới mát", "", "2 lần/ngày", "Dùng chung", "", ""],
        [4, "Kiểm tra sâu, bệnh", "", "Hàng ngày", "Dùng chung", "x", ""],
    ]
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'`
Expected: PASS (gồm test cũ + 2 test mới).

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/sheet_import.py backend/akf_farm/akf_farm/api/test_sheet_import.py
git commit -m "feat: Excel them cot Bat dau sau (ngay) -> offset_days"
```

---

## Task 7: Frontend — ô offset trong form bước + bảng

**Files:**
- Modify: `frontend/src/components/admin/ProcessManagement.tsx`

**Interfaces:**
- Consumes: `list_processes` trả `offsetDays` (Task 5).
- Produces: form/bảng bước hiển thị + gửi `offsetDays` (số ≥ 0 hoặc -1 = tự động).

- [ ] **Step 1: Thêm `offsetDays` vào interface + emptyStep + toApiSteps**

Sửa `interface Step` — thêm field:

```ts
interface Step { step: number; description: string; workPerHa: number; frequency: string; frequencyType: string; frequencyValue: number; scope: string; scopeRaw: string; requirePhoto: boolean; offsetDays: number; }
```

Sửa `emptyStep` — thêm `offsetDays: -1`:

```ts
const emptyStep = (): Step => ({ step: 0, description: "", workPerHa: 0, frequency: "", frequencyType: "one_time", frequencyValue: 1, scope: "", scopeRaw: "shared", requirePhoto: false, offsetDays: -1 });
```

Sửa `toApiSteps` — thêm `offsetDays`:

```ts
const toApiSteps = (steps: Step[]) =>
  steps.map((s) => ({ description: s.description, workPerHa: s.workPerHa, frequencyType: s.frequencyType,
    frequencyValue: s.frequencyValue, scopeRaw: s.scopeRaw, requirePhoto: s.requirePhoto, offsetDays: s.offsetDays }));
```

- [ ] **Step 2: Thêm cột "Bắt đầu sau" vào bảng (desktop)**

Trong `<thead>` (sau cột "Phạm vi"), thêm `<th>`:

```tsx
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bắt đầu sau</th>
```

Trong `<tbody>` row (sau ô `scope`), thêm `<td>`:

```tsx
                      <td className="px-4 py-4 text-sm text-gray-600">{step.offsetDays >= 0 ? `${step.offsetDays} ngày` : "Tự động"}</td>
```

(Lưu ý: cập nhật `colSpan={7}` ở dòng "Chưa có bước nào" thành `colSpan={8}`.)

- [ ] **Step 3: Thêm ô offset vào `StepForm`**

Trong `StepForm`, sau `Field` Phạm vi (trước label checkbox "Yêu cầu chụp ảnh"), thêm:

```tsx
      <Field label="Bắt đầu sau khi gieo (ngày)">
        <input type="number" min={0}
          value={form.offsetDays >= 0 ? form.offsetDays : ""}
          onChange={(e) => setForm({ ...form, offsetDays: e.target.value === "" ? -1 : Number(e.target.value) })}
          placeholder="Để trống = tự động theo giai đoạn" className={inputCls} />
      </Field>
```

- [ ] **Step 4: Kiểm tra biên dịch (scoped)**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "ProcessManagement"`
Expected: KHÔNG có dòng nào (chỉ ~11 lỗi cũ ở file khác).

- [ ] **Step 5: Kiểm tra tay trên dev**

- Mở `http://localhost:8080` → Quản lý quy trình → mở 1 quy trình → "Thêm bước": ô "Bắt đầu sau khi gieo (ngày)" để trống → bảng hiện "Tự động"; nhập 7 → bảng hiện "7 ngày".
- Expected: lưu + hiển thị đúng.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/admin/ProcessManagement.tsx
git commit -m "feat: form quy trinh them o Bat dau sau khi gieo (offset)"
```

---

## Self-Review (đã thực hiện khi viết plan)

**Spec coverage:**
- `offset_days` (-1 auto) + `setup_done_on` → Task 1. ✓
- Khối setup (one_time đầu, offset trong suốt) → Task 2 `setup_step_indices`. ✓
- 3 mức anchor (offset≥0 / setup / bảo trì-sau-setup) + stamp setup_done_on → Task 3. ✓
- Sinh bảo trì ngay khi hoàn thành setup → Task 4 `complete_task`. ✓
- offset qua API quy trình → Task 5. ✓
- offset qua Excel (mẫu + import) → Task 6. ✓
- offset trên UI form + bảng → Task 7. ✓
- Dời task thủ công → đã có (`reschedule_task`), không cần task. ✓

**Type consistency:** `setup_step_indices(list[(ftype,offset)])->set` dùng ở Task 3/`stamp_setup_if_done`; `offset_days` (backend) ↔ `offsetDays` (API/FE) nhất quán; `_norm_offset`/`_offset` cùng quy ước trống→-1; `stamp_setup_if_done` KHÔNG gọi generate_tasks (tránh đệ quy), chỉ Task 4 gọi generate_tasks sau khi stamp.

**Placeholder scan:** Không có TBD/TODO; mọi step có code/lệnh cụ thể.
