# Quy trình tường minh — thời gian bắt đầu + bước tiên quyết — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay auto-detect (setup heuristic) bằng khai báo tường minh: mỗi bước có offset (ngày bắt đầu) + bước tiên quyết tùy chọn; quy trình có độ dài chu kỳ; mỗi chu kỳ sinh task độc lập.

**Architecture:** Event-driven: bước có prereq chỉ sinh sau khi task prereq của CHÍNH chu kỳ đó `completed`, neo từ `completed_on + offset`. Việc lặp dừng ở `start_date + cycle_length_days`. Khử trùng per_crop theo `(cycle, task_date, title)` (tách chu kỳ), shared gộp theo `(block, task_date, title)`.

**Tech Stack:** Frappe v15 / Python (engine + API); React 18 + TS (frontend).

## Global Constraints

- `offset_days` (Cultivation Step): Int default **0**, nghĩa là số ngày sau mốc neo; 0 = ngay. KHÔNG còn sentinel -1.
- `prerequisite` (Cultivation Step): Data, lưu **mô tả** của bước khác trong cùng quy trình; rỗng = không có.
- `cycle_length_days` (Cultivation Process): Int; >0 = việc lặp dừng tại `start_date + cycle_length_days`; 0 = không giới hạn.
- `completed_on` (Farm Task): Date, set khi hoàn thành; mốc neo cho bước phụ thuộc.
- Khử trùng: per_crop = `(cycle, task_date, title)`; shared (crop="Chung") = `(block, task_date, title)`.
- Event-driven: bước có prereq CHƯA hoàn thành → KHÔNG sinh. Hook `crop_cycle_after_insert` giữ nguyên.
- Field `Crop Cycle.setup_done_on` GIỮ NGUYÊN (không xóa) nhưng KHÔNG dùng nữa — tránh rủi ro thứ tự migrate; có thể dọn sau.
- Chữ tiếng Việt giữ đúng dấu (UTF-8). Sửa DocType json → `bench migrate`.
- Test backend: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module <mod>'` (set-config allow_tests true nếu cần).
- Test thuần (host): `cd backend/akf_farm && python -m pytest akf_farm/engine/test_task_generator.py -q`.
- Frontend verify (host): `cd frontend && npx tsc --noEmit 2>&1 | grep -E "ProcessManagement"` (rỗng = OK; ~11 lỗi cũ ở file khác bỏ qua).
- Commit ASCII, không ký tự `"` trong message. Backend bind-mount live.

---

## File Structure

**Backend**
- `.../doctype/cultivation_step/cultivation_step.json` — offset_days default 0 + thêm `prerequisite`. (Modify)
- `.../doctype/cultivation_process/cultivation_process.json` — thêm `cycle_length_days`. (Modify)
- `.../doctype/farm_task/farm_task.json` — thêm `completed_on`. (Modify)
- `akf_farm/engine/task_generator.py` — `_prereq_anchor`; rewrite `generate_tasks`; (Task 3) xóa `setup_step_indices`/`_setup_complete`/`stamp_setup_if_done`. (Modify)
- `akf_farm/engine/test_phased_generation.py` — thay bằng test mô hình mới. (Modify)
- `akf_farm/engine/test_task_generator.py` — (Task 3) xóa `TestSetupStepIndices`. (Modify)
- `akf_farm/api/field_api.py` — rewrite `complete_task`. (Modify)
- `akf_farm/api/admin_api.py` — `_apply_steps` + create/update/list process. (Modify)

**Frontend**
- `frontend/src/lib/queries.ts` — createProcess/updateProcess nhận `cycle_length_days`. (Modify)
- `frontend/src/components/admin/ProcessManagement.tsx` — ẩn Excel; form bước/quy trình; bảng. (Modify)

---

## Task 1: DocType fields + migrate + data fix

**Files:**
- Modify: `backend/akf_farm/akf_farm/akf_farm/doctype/cultivation_step/cultivation_step.json`
- Modify: `backend/akf_farm/akf_farm/akf_farm/doctype/cultivation_process/cultivation_process.json`
- Modify: `backend/akf_farm/akf_farm/akf_farm/doctype/farm_task/farm_task.json`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py` (chỉ thêm 1 test field; nội dung khác xử lý ở Task 2)

**Interfaces:**
- Produces: `Cultivation Step.offset_days` (default 0), `Cultivation Step.prerequisite` (Data), `Cultivation Process.cycle_length_days` (Int), `Farm Task.completed_on` (Date).

- [ ] **Step 1: Viết test thất bại — thêm class vào `engine/test_phased_generation.py`** (đặt ở đầu, sau import)

```python
import frappe
from frappe.tests.utils import FrappeTestCase


class TestExplicitFields(FrappeTestCase):
    def test_step_offset_default_zero_and_prereq_field(self):
        if frappe.db.exists("Cultivation Process", "QT F2"):
            frappe.delete_doc("Cultivation Process", "QT F2", force=True)
        p = frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "QT F2", "crop": "Gấc",
            "cycle_length_days": 1095,
            "steps": [{"step": 1, "description": "X", "frequency_type": "one_time"}],
        }).insert()
        self.assertEqual(p.steps[0].offset_days, 0)
        self.assertEqual(p.cycle_length_days, 1095)
        self.assertTrue(frappe.get_meta("Cultivation Step").has_field("prerequisite"))
        self.assertTrue(frappe.get_meta("Farm Task").has_field("completed_on"))
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — fields chưa có.

- [ ] **Step 3: Sửa `cultivation_step.json`**

Đổi `default` của field `offset_days` từ `"-1"` thành `"0"`. Thêm `"prerequisite"` vào `field_order` (sau `offset_days`) và thêm field object vào `fields`:

```json
  {
   "fieldname": "prerequisite",
   "fieldtype": "Data",
   "label": "Bước tiên quyết"
  }
```

- [ ] **Step 4: Sửa `cultivation_process.json`**

Thêm `"cycle_length_days"` vào `field_order` (sau `steps`) và field object:

```json
  {
   "fieldname": "cycle_length_days",
   "fieldtype": "Int",
   "label": "Số ngày 1 chu kỳ"
  }
```

- [ ] **Step 5: Sửa `farm_task.json`**

Thêm `"completed_on"` vào `field_order` (cuối) và field object:

```json
  {
   "fieldname": "completed_on",
   "fieldtype": "Date",
   "label": "Ngày hoàn thành",
   "read_only": 1
  }
```

- [ ] **Step 6: Migrate**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost migrate'`
Expected: migrate xong, các cột mới được thêm.

- [ ] **Step 7: Data fix — offset_days -1 → 0 (dữ liệu cũ)**

Tạo file `/tmp/akf_offset_fix.py` rồi chạy trong container:

```python
import frappe
frappe.init(site="akf.localhost")
frappe.connect()
frappe.db.sql("update `tabCultivation Step` set offset_days = 0 where offset_days < 0")
frappe.db.commit()
print("offset_days < 0 -> 0 done")
```

Run:
```bash
docker compose cp /tmp/akf_offset_fix.py backend:/tmp/akf_offset_fix.py
docker compose exec backend bash -lc 'cd /home/frappe/frappe-bench/sites && ../env/bin/python /tmp/akf_offset_fix.py'
```
Expected: "offset_days < 0 -> 0 done".

- [ ] **Step 8: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: TestExplicitFields PASS (các test cũ trong file có thể còn FAIL — sẽ thay ở Task 2).

- [ ] **Step 9: Commit**

```bash
git add backend/akf_farm/akf_farm/akf_farm/doctype/cultivation_step/cultivation_step.json backend/akf_farm/akf_farm/akf_farm/doctype/cultivation_process/cultivation_process.json backend/akf_farm/akf_farm/akf_farm/doctype/farm_task/farm_task.json backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: them offset_days(0)/prerequisite, cycle_length_days, completed_on"
```

---

## Task 2: Rewrite `generate_tasks` (prereq + cycle_length + tách chu kỳ)

**Files:**
- Modify: `backend/akf_farm/akf_farm/engine/task_generator.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py` (THAY toàn bộ test sinh việc cũ bằng test mô hình mới)

**Interfaces:**
- Consumes: `due_dates`, `dedupe_shared`, `compute_mandays`, `assign_tasks`.
- Produces: `_prereq_anchor(cycle_name, prereq_title) -> date|None`; `generate_tasks` neo theo prereq/offset, dừng theo cycle_length, khử trùng tách chu kỳ.

- [ ] **Step 1: THAY nội dung test sinh việc — `engine/test_phased_generation.py`**

Giữ `TestExplicitFields` (Task 1). Thay các class test sinh việc cũ bằng helpers + class mới:

```python
from frappe.utils import getdate, add_days
from akf_farm.engine.task_generator import generate_tasks


def _proc(name, steps, cycle_length=0):
    if frappe.db.exists("Cultivation Process", name):
        frappe.delete_doc("Cultivation Process", name, force=True)
    frappe.get_doc({"doctype": "Cultivation Process", "process_name": name, "crop": "Gấc",
                    "cycle_length_days": cycle_length, "steps": steps}).insert()


def _block(name):
    if not frappe.db.exists("Farm Zone", "Z EX"):
        frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z EX", "area": 10000}).insert()
    if not frappe.db.exists("Farm Block", name):
        frappe.get_doc({"doctype": "Farm Block", "block_name": name, "zone": "Z EX", "area": 10000}).insert()


def _cycle(block, process, crop="Gấc"):
    return frappe.get_doc({"doctype": "Crop Cycle", "block": block, "crop": crop,
                           "cultivation_process": process, "start_date": str(getdate()),
                           "status": "active"}).insert().name


def _has(cycle, title, date):
    return bool(frappe.db.exists("Farm Task", {"cycle": cycle, "title": title, "task_date": str(date)}))


class TestExplicitGeneration(FrappeTestCase):
    def test_no_prereq_offset(self):
        _proc("QT NP", [
            {"step": 1, "description": "Ngay NP", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Sau3 NP", "frequency_type": "one_time", "scope": "per_crop", "offset_days": 3},
        ])
        _block("B NP")
        name = _cycle("B NP", "QT NP")
        today = getdate()
        self.assertTrue(_has(name, "Ngay NP", today))
        self.assertFalse(_has(name, "Sau3 NP", today))
        self.assertTrue(_has(name, "Sau3 NP", add_days(today, 3)))

    def test_prereq_gates_and_anchors(self):
        _proc("QT PR", [
            {"step": 1, "description": "Gieo PR", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Tưới PR", "frequency_type": "daily", "scope": "per_crop",
             "prerequisite": "Gieo PR"},
        ])
        _block("B PR")
        name = _cycle("B PR", "QT PR")
        today = getdate()
        self.assertFalse(_has(name, "Tưới PR", today))  # prereq chưa xong
        gieo = frappe.get_all("Farm Task", filters={"cycle": name, "title": "Gieo PR"})[0].name
        frappe.db.set_value("Farm Task", gieo, {"status": "completed", "completed_on": str(today)})
        generate_tasks()
        self.assertTrue(_has(name, "Tưới PR", today))  # neo từ completed_on

    def test_cycle_length_stops_recurring(self):
        _proc("QT CL", [
            {"step": 1, "description": "Lặp CL", "frequency_type": "daily", "scope": "per_crop"},
        ], cycle_length=2)
        _block("B CL")
        name = _cycle("B CL", "QT CL")
        today = getdate()
        self.assertTrue(_has(name, "Lặp CL", today))
        self.assertTrue(_has(name, "Lặp CL", add_days(today, 2)))
        self.assertFalse(_has(name, "Lặp CL", add_days(today, 5)))  # vượt cycle_length=2

    def test_per_crop_keyed_by_cycle(self):
        # chu kỳ cũ đóng + chu kỳ mới cùng lô/cây: task chu kỳ mới KHÔNG bị khử trùng nhầm
        _proc("QT CY", [{"step": 1, "description": "Việc CY", "frequency_type": "one_time", "scope": "per_crop"}])
        _block("B CY")
        old = _cycle("B CY", "QT CY")
        frappe.db.set_value("Crop Cycle", old, "status", "closed")
        new = _cycle("B CY", "QT CY")
        generate_tasks()
        self.assertTrue(_has(new, "Việc CY", getdate()))  # task gắn đúng chu kỳ mới

    def test_shared_merged_per_block(self):
        _proc("QT SH", [{"step": 1, "description": "Họp SH", "frequency_type": "one_time", "scope": "shared"}])
        _block("B SH")
        g = _cycle("B SH", "QT SH", crop="Gấc")
        # tạo thêm cây Sâm cùng lô (cần process Sâm)
        _proc_s = "QT SH S"
        if frappe.db.exists("Cultivation Process", _proc_s):
            frappe.delete_doc("Cultivation Process", _proc_s, force=True)
        frappe.get_doc({"doctype": "Cultivation Process", "process_name": _proc_s, "crop": "Sâm",
                        "steps": [{"step": 1, "description": "Họp SH", "frequency_type": "one_time", "scope": "shared"}]}).insert()
        frappe.get_doc({"doctype": "Crop Cycle", "block": "B SH", "crop": "Sâm",
                        "cultivation_process": _proc_s, "start_date": str(getdate()), "status": "active"}).insert()
        generate_tasks()
        cnt = frappe.db.count("Farm Task", {"block": "B SH", "title": "Họp SH", "task_date": str(getdate())})
        self.assertEqual(cnt, 1)  # gộp 1 task/lô dù 2 cây
```

(Xóa các class cũ `TestPhasedGeneration`, `TestCompleteTaskFinishesSetup`, `TestProcessOffsetApi` trong file — sẽ có test mới ở Task 3/4.)

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — generate_tasks chưa theo mô hình mới (vd "Tưới PR" sinh ngay; cycle_length chưa chặn).

- [ ] **Step 3: Thêm `_prereq_anchor` + rewrite vòng lặp `generate_tasks` trong `task_generator.py`**

Thêm helper (đặt trên `generate_tasks`):

```python
def _prereq_anchor(cycle_name, prereq_title):
    """Ngày neo cho bước phụ thuộc = max(completed_on) của task prereq (theo title) đã hoàn thành
    trong cycle. None nếu chưa có task prereq nào completed. Fallback task_date nếu completed_on rỗng."""
    import frappe
    from frappe.utils import getdate

    tasks = frappe.get_all(
        "Farm Task",
        filters={"cycle": cycle_name, "title": prereq_title, "status": "completed"},
        fields=["completed_on", "task_date"],
    )
    if not tasks:
        return None
    return max(getdate(t.completed_on or t.task_date) for t in tasks)
```

Thay khối từ `proc = frappe.get_doc(...)` tới hết phần ghép `rows` + vòng `for r in dedupe_shared(rows)` bằng:

```python
        proc = frappe.get_doc("Cultivation Process", c.cultivation_process)
        start = getdate(c.start_date)
        window_end = to_d
        cyclen = int(proc.cycle_length_days or 0)
        if cyclen > 0:
            cycle_end = getdate(add_days(start, cyclen))
            if cycle_end < window_end:
                window_end = cycle_end
        for s in proc.steps:
            freq = (s.frequency_type, s.frequency_value) if s.frequency_type else ("one_time", 1)
            offset = int(s.offset_days or 0)
            if s.prerequisite:
                base = _prereq_anchor(c.name, s.prerequisite)
                if base is None:
                    continue  # prereq chưa hoàn thành -> chưa sinh
                anchor = getdate(add_days(base, offset))
            else:
                anchor = getdate(add_days(start, offset))
            for d in due_dates(anchor, freq, from_d, window_end):
                rows.append({
                    "cycle": c.name, "block": c.block, "crop": c.crop, "date": d,
                    "description": s.description, "scope": s.scope, "require_photo": s.require_photo,
                    "mandays": compute_mandays(s.mandays_per_ha, area_of[c.block]),
                })
    for r in dedupe_shared(rows):
        if r.get("scope") == "shared":
            exists = frappe.db.exists("Farm Task", {
                "block": r["block"], "crop": "Chung",
                "task_date": str(r["date"]), "title": r["description"],
            })
        else:
            exists = frappe.db.exists("Farm Task", {
                "cycle": r["cycle"], "task_date": str(r["date"]), "title": r["description"],
            })
        if exists:
            continue
        frappe.get_doc({
            "doctype": "Farm Task", "title": r["description"], "block": r["block"],
            "crop": r["crop"], "cycle": r.get("cycle"), "task_date": str(r["date"]),
            "status": "pending", "require_photo": r.get("require_photo") or 0,
            "mandays": r.get("mandays") or 0,
        }).insert()
        created += 1
```

(Bỏ 2 dòng cũ `setup_idx = setup_step_indices(...)` và `setup_done = stamp_setup_if_done(c.name)`. Các hàm setup_* để lại — Task 3 xóa.)

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: PASS (TestExplicitFields + TestExplicitGeneration).

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/engine/task_generator.py backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: generate_tasks theo prereq + cycle_length + tach chu ky"
```

---

## Task 3: `complete_task` (completed_on) + dọn helper cũ

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/field_api.py`
- Modify: `backend/akf_farm/akf_farm/engine/task_generator.py` (xóa setup_* helpers)
- Modify: `backend/akf_farm/akf_farm/engine/test_task_generator.py` (xóa TestSetupStepIndices)
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py` (thêm test complete_task)

**Interfaces:**
- Consumes: `generate_tasks`.
- Produces: `complete_task` set `completed_on=today` + gọi `generate_tasks()`.

- [ ] **Step 1: Viết test thất bại — thêm vào `engine/test_phased_generation.py`**

```python
from akf_farm.api import field_api


class TestCompleteSetsCompletedOn(FrappeTestCase):
    def test_complete_sets_completed_on_and_unlocks(self):
        _proc("QT CT", [
            {"step": 1, "description": "Gieo CT", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Tưới CT", "frequency_type": "daily", "scope": "per_crop",
             "prerequisite": "Gieo CT"},
        ])
        _block("B CT")
        name = _cycle("B CT", "QT CT")
        today = getdate()
        self.assertFalse(_has(name, "Tưới CT", today))
        gieo = frappe.get_all("Farm Task", filters={"cycle": name, "title": "Gieo CT"})[0].name
        field_api.complete_task(gieo)
        self.assertEqual(str(frappe.db.get_value("Farm Task", gieo, "completed_on")), str(today))
        self.assertTrue(_has(name, "Tưới CT", today))  # mở khóa bước phụ thuộc ngay
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — completed_on chưa được set / Tưới CT chưa mở khóa.

- [ ] **Step 3: Rewrite `complete_task` trong `field_api.py`**

Đổi dòng import (dòng 4) thành:

```python
from akf_farm.engine.task_generator import generate_tasks
```

Thay khối sau `doc.save()` (đoạn `if doc.cycle: ... stamp_setup_if_done ...`) bằng:

```python
    doc.db_set("completed_on", str(getdate()))
    if doc.cycle:
        generate_tasks()  # mở khóa các bước có prereq trỏ tới việc vừa xong
    return {"ok": True}
```

- [ ] **Step 4: Xóa helper cũ trong `task_generator.py`**

Xóa 3 hàm không còn dùng: `setup_step_indices`, `_setup_complete`, `stamp_setup_if_done` (dòng ~4-56).

- [ ] **Step 5: Xóa test thuần cũ trong `test_task_generator.py`**

Xóa class `TestSetupStepIndices` và dòng `from akf_farm.engine.task_generator import setup_step_indices` (đã không còn hàm).

- [ ] **Step 6: Chạy test (Frappe + thuần) để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: PASS.
Run: `cd backend/akf_farm && python -m pytest akf_farm/engine/test_task_generator.py -q`
Expected: PASS (không còn import lỗi).

- [ ] **Step 7: Commit**

```bash
git add backend/akf_farm/akf_farm/api/field_api.py backend/akf_farm/akf_farm/engine/task_generator.py backend/akf_farm/akf_farm/engine/test_task_generator.py backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: complete_task set completed_on + don helper setup cu"
```

---

## Task 4: API quy trình — offset/prerequisite/cycle_length

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/admin_api.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py`

**Interfaces:**
- Produces: `_apply_steps` lưu `offset_days`(>=0, default 0) + `prerequisite`; `create_process`/`update_process` nhận `cycle_length_days`; `list_processes` trả `offsetDays`/`prerequisite` mỗi bước + `cycleLengthDays` mỗi quy trình.

- [ ] **Step 1: Viết test thất bại — thêm vào `engine/test_phased_generation.py`**

```python
from akf_farm.api import admin_api


class TestProcessApi(FrappeTestCase):
    def test_create_list_offset_prereq_cyclelen(self):
        if frappe.db.exists("Cultivation Process", "QT API2"):
            frappe.delete_doc("Cultivation Process", "QT API2", force=True)
        admin_api.create_process(process_name="QT API2", crop="Gấc", cycle_length_days=1095, steps=[
            {"description": "Gieo", "frequencyType": "one_time", "scopeRaw": "per_crop"},
            {"description": "Tưới", "frequencyType": "daily", "scopeRaw": "per_crop",
             "offsetDays": 2, "prerequisite": "Gieo"},
        ])
        doc = frappe.get_doc("Cultivation Process", "QT API2")
        self.assertEqual(doc.cycle_length_days, 1095)
        self.assertEqual(doc.steps[0].offset_days, 0)
        self.assertEqual(doc.steps[1].offset_days, 2)
        self.assertEqual(doc.steps[1].prerequisite, "Gieo")
        listed = [p for p in admin_api.list_processes() if p["id"] == "QT API2"][0]
        self.assertEqual(listed["cycleLengthDays"], 1095)
        self.assertEqual(listed["steps"][1]["offsetDays"], 2)
        self.assertEqual(listed["steps"][1]["prerequisite"], "Gieo")
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — cycle_length_days/prerequisite chưa lưu/trả.

- [ ] **Step 3: Sửa `_norm_offset` + `_apply_steps` trong `admin_api.py`**

Đổi `_norm_offset` để trống/None → 0 (thay vì -1):

```python
def _norm_offset(v):
    if v is None or v == "":
        return 0
    try:
        return max(0, int(v))
    except (TypeError, ValueError):
        return 0
```

Trong `_apply_steps`, dict `doc.append("steps", {...})` thêm:

```python
            "offset_days": _norm_offset(s.get("offsetDays")),
            "prerequisite": (s.get("prerequisite") or None),
```

- [ ] **Step 4: Sửa `create_process` / `update_process` / `list_processes`**

`create_process(process_name, crop=None, steps=None, cycle_length_days=0)`:

```python
@frappe.whitelist()
def create_process(process_name, crop=None, steps=None, cycle_length_days=0):
    doc = frappe.get_doc({"doctype": "Cultivation Process", "process_name": process_name,
                          "crop": crop, "cycle_length_days": int(cycle_length_days or 0)})
    _apply_steps(doc, steps)
    doc.insert()
    return {"id": doc.name, "name": doc.process_name, "crop": doc.crop}
```

`update_process` — thêm xử lý cycle_length_days (cạnh chỗ set crop):

```python
@frappe.whitelist()
def update_process(name, process_name=None, crop=None, steps=None, cycle_length_days=None):
    doc = frappe.get_doc("Cultivation Process", name)
    if crop is not None:
        doc.crop = crop
    if cycle_length_days is not None:
        doc.cycle_length_days = int(cycle_length_days or 0)
    if steps is not None:
        _apply_steps(doc, steps)
    doc.save()
    if process_name and process_name != doc.process_name:
        doc = frappe.rename_doc("Cultivation Process", doc.name, process_name, force=True)
    return {"id": doc.name, "name": doc.process_name, "crop": doc.crop}
```

`list_processes` — step dict thêm `offsetDays` + `prerequisite`; process dict thêm `cycleLengthDays`:

```python
        steps = [{
            "step": s.step, "description": s.description, "workPerHa": s.mandays_per_ha,
            "frequency": _freq_text(s.frequency_type, s.frequency_value),
            "frequencyType": s.frequency_type or "one_time", "frequencyValue": s.frequency_value or 1,
            "scope": _scope_text(s.scope), "scopeRaw": s.scope or "shared",
            "requirePhoto": bool(s.require_photo),
            "offsetDays": s.offset_days or 0, "prerequisite": s.prerequisite or "",
        } for s in doc.steps]
        out.append({"id": p.name, "name": p.process_name, "crop": p.crop,
                    "cycleLengthDays": doc.cycle_length_days or 0, "steps": steps})
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/akf_farm/akf_farm/api/admin_api.py backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: API quy trinh luu/tra offset, prerequisite, cycle_length_days"
```

---

## Task 5: Frontend — ẩn Excel + form bước/quy trình + bảng

**Files:**
- Modify: `frontend/src/lib/queries.ts`
- Modify: `frontend/src/components/admin/ProcessManagement.tsx`

**Interfaces:**
- Consumes: `list_processes` trả `offsetDays`/`prerequisite`/`cycleLengthDays`; `create/update_process` nhận `cycle_length_days`.
- Produces: form bước có "Bắt đầu" + "Bước tiên quyết"; form quy trình có "Số ngày 1 chu kỳ"; ẩn nút Excel.

- [ ] **Step 1: `queries.ts` — createProcess/updateProcess nhận cycle_length_days**

Sửa 2 hàm:

```ts
export const createProcess = (p: { process_name: string; crop?: string; steps?: unknown[]; cycle_length_days?: number }) =>
  api.post("admin_api.create_process", p);
export const updateProcess = (name: string, p: Record<string, unknown>) =>
  api.post("admin_api.update_process", { name, ...p });
```

(`updateProcess` đã nhận object tùy ý — chỉ cần frontend truyền `cycle_length_days`.)

- [ ] **Step 2: `ProcessManagement.tsx` — interface + emptyStep + toApiSteps + Process cycleLengthDays**

Sửa interfaces + factory:

```ts
interface Step { step: number; description: string; workPerHa: number; frequency: string; frequencyType: string; frequencyValue: number; scope: string; scopeRaw: string; requirePhoto: boolean; offsetDays: number; prerequisite: string; }
interface Process { id: string; name: string; crop: string; cycleLengthDays: number; steps: Step[]; }
```

```ts
const emptyProcess = (): Process => ({ id: "", name: "", crop: "Gấc", cycleLengthDays: 0, steps: [] });
const emptyStep = (): Step => ({ step: 0, description: "", workPerHa: 0, frequency: "", frequencyType: "one_time", frequencyValue: 1, scope: "", scopeRaw: "shared", requirePhoto: false, offsetDays: 0, prerequisite: "" });
```

`toApiSteps` thêm 2 field:

```ts
const toApiSteps = (steps: Step[]) =>
  steps.map((s) => ({ description: s.description, workPerHa: s.workPerHa, frequencyType: s.frequencyType,
    frequencyValue: s.frequencyValue, scopeRaw: s.scopeRaw, requirePhoto: s.requirePhoto,
    offsetDays: s.offsetDays, prerequisite: s.prerequisite }));
```

`saveProcess` — gửi cycle_length_days:

```ts
      if (data.id) {
        const res = await updateProcess(data.id, { process_name: data.name, crop: data.crop, cycle_length_days: data.cycleLengthDays });
        await reload(res?.id ?? data.id);
      } else {
        const res = await createProcess({ process_name: data.name, crop: data.crop, steps: [], cycle_length_days: data.cycleLengthDays });
        await reload(res?.id);
      }
```

`persistSteps` (gửi cả cycle_length để không mất khi lưu bước):

```ts
    await updateProcess(procId, { process_name: proc.name, crop: proc.crop, cycle_length_days: proc.cycleLengthDays, steps: toApiSteps(steps) });
```

- [ ] **Step 3: Ẩn nút Excel (xóa khỏi JSX khối "Danh sách quy trình")**

Trong cụm nút header, XÓA thẻ `<a ...PROCESS_TEMPLATE_URL...>Tải mẫu Excel</a>`, nút `<Button ...>Nhập từ Excel</Button>` và `<input ref={fileRef} .../>`. Giữ lại nút "Thêm quy trình". (Giữ import + state importing/overwrite/fileRef + hàm doImport/onPickFile để dễ bật lại — hoặc xóa nếu lint báo unused; nếu xóa, bỏ luôn import Upload/Download và importProcessExcel/PROCESS_TEMPLATE_URL.)

Lưu ý: nếu để lại code import/handler không dùng gây lỗi tsc "unused", thì xóa chúng cho sạch.

- [ ] **Step 4: ProcessForm — thêm ô "Số ngày 1 chu kỳ"**

Trong `ProcessForm`, sau `Field` Cây trồng, thêm:

```tsx
      <Field label="Số ngày 1 chu kỳ (để trống = không giới hạn)">
        <input type="number" min={0} value={form.cycleLengthDays || ""}
          onChange={(e) => setForm({ ...form, cycleLengthDays: Number(e.target.value) })} className={inputCls} />
      </Field>
```

- [ ] **Step 5: StepForm — "Bắt đầu" + "Bước tiên quyết"**

`StepForm` cần biết các bước khác để làm dropdown prereq. Truyền thêm prop `otherSteps: string[]` (mô tả các bước khác). Sửa chỗ render StepForm:

```tsx
{stepModal && <StepForm modal={stepModal} otherSteps={(procs.find((p) => p.id === stepModal.procId)?.steps || []).filter((_, i) => i !== stepModal.index).map((s) => s.description)} onClose={() => setStepModal(null)} onSave={(d) => saveStep(stepModal.procId, stepModal.index, d)} />}
```

Trong `StepForm` (thêm `otherSteps` vào props), thêm 2 Field sau Field Phạm vi:

```tsx
      <Field label="Bắt đầu">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-sm"><input type="radio" checked={form.offsetDays === 0} onChange={() => setForm({ ...form, offsetDays: 0 })} /> Ngay</label>
          <label className="flex items-center gap-1 text-sm"><input type="radio" checked={form.offsetDays > 0} onChange={() => setForm({ ...form, offsetDays: 1 })} /> Sau N ngày</label>
          {form.offsetDays > 0 && (
            <input type="number" min={1} value={form.offsetDays} onChange={(e) => setForm({ ...form, offsetDays: Math.max(1, Number(e.target.value)) })} className="w-24 px-2 py-1 border border-gray-300 rounded" />
          )}
        </div>
      </Field>
      <Field label="Bước tiên quyết (tùy chọn)">
        <select value={form.prerequisite} onChange={(e) => setForm({ ...form, prerequisite: e.target.value })} className={inputCls}>
          <option value="">— Không —</option>
          {otherSteps.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
```

Cập nhật chữ ký `StepForm`:

```tsx
function StepForm({ modal, otherSteps, onClose, onSave }: { modal: { mode: "add" | "edit"; data: Step }; otherSteps: string[]; onClose: () => void; onSave: (d: Step) => void; }) {
```

- [ ] **Step 6: Bảng bước — cột "Bắt đầu" + "Tiên quyết"**

Trong `<thead>` (sau "Phạm vi"), thêm 2 `<th>`: `Bắt đầu`, `Tiên quyết`. Trong `<tbody>` row (sau ô scope) thêm 2 `<td>`:

```tsx
                      <td className="px-4 py-4 text-sm text-gray-600">{step.offsetDays > 0 ? `Sau ${step.offsetDays} ngày` : "Ngay"}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{step.prerequisite || "—"}</td>
```

Cập nhật `colSpan` của dòng "Chưa có bước nào" cho khớp số cột mới (đếm lại tổng số `<th>`). Bảng mobile (dạng thẻ): thêm 2 dòng "Bắt đầu" + "Tiên quyết" tương tự các dòng hiện có.

- [ ] **Step 7: Kiểm tra biên dịch (scoped)**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "ProcessManagement|queries"`
Expected: KHÔNG có dòng nào.

- [ ] **Step 8: Kiểm tra tay trên dev**

- Mở `http://localhost:8080` → Quản lý quy trình: KHÔNG còn nút Excel.
- Thêm quy trình: có ô "Số ngày 1 chu kỳ".
- Thêm bước: chọn "Ngay/Sau N ngày" + "Bước tiên quyết" (dropdown các bước đã có). Bảng hiện đúng "Bắt đầu" + "Tiên quyết".

- [ ] **Step 9: Commit**

```bash
git add frontend/src/lib/queries.ts frontend/src/components/admin/ProcessManagement.tsx
git commit -m "feat: form quy trinh - bat dau, buoc tien quyet, so ngay chu ky; an Excel"
```

---

## Self-Review (đã thực hiện khi viết plan)

**Spec coverage:**
- offset_days(0)/prerequisite, cycle_length_days, completed_on → Task 1. ✓
- generate_tasks prereq-anchor + cycle_length stop + tách chu kỳ (per_crop theo cycle, shared theo block) → Task 2. ✓
- complete_task set completed_on + generate; dọn setup_* → Task 3. ✓
- API offset/prereq/cycle_length + list → Task 4. ✓
- Ẩn Excel + form bước (Bắt đầu, Tiên quyết) + form quy trình (số ngày chu kỳ) + bảng → Task 5. ✓
- Event-driven (prereq chưa xong → không sinh) → Task 2 logic + test. ✓
- Giữ field setup_done_on (deprecated) → ghi rõ Global Constraints. ✓

**Type consistency:** `offsetDays`/`prerequisite`/`cycleLengthDays` (camelCase API/FE) ↔ `offset_days`/`prerequisite`/`cycle_length_days` (snake DocType); `_prereq_anchor(cycle, title)->date|None`; khóa khử trùng per_crop `(cycle,task_date,title)` nhất quán giữa generate + test `_has`. complete_task dùng `generate_tasks` (bỏ stamp_setup_if_done).

**Placeholder scan:** Không có TBD/TODO; mọi step có code/lệnh cụ thể.
