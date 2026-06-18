# Dự báo lịch theo kế hoạch (forecast) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sinh lịch theo NGÀY DỰ KIẾN tính từ chuỗi tiên quyết + ước lượng thời gian, để lấp đủ cửa sổ 10 ngày — thay cơ chế chờ hoàn thành thật.

**Architecture:** Thêm `estimated_days` (chỉ nhập cho bước "1 lần/chu kỳ"). Hàm thuần `planned_starts` tính ngày bắt đầu dự kiến mỗi bước (đệ quy theo tiên quyết, an toàn vòng lặp). `generate_tasks` neo mỗi bước vào ngày dự kiến (bỏ gating). `complete_task` chỉ ghi `completed_on`. Lịch cố định, admin dời tay nếu cần.

**Tech Stack:** Frappe v15 / Python (engine + API); React 18 + TS (frontend).

## Global Constraints

- `est_days(step)`: `one_time` → `estimated_days` (Int, nhập tay, default 1); `daily` → 1; `n_per_period` → `frequency_value` (Y).
- Ngày dự kiến: không tiên quyết → `start_date + offset_days`; có tiên quyết P → `(start(P) + est_days(P) − 1) + 1 + offset_days`.
- `generate_tasks` neo vào ngày dự kiến, KHÔNG còn skip theo hoàn thành; giữ `times_per_period` (X task/ngày, hậu tố "(lần i/X)"), `cycle_length_days` (dừng lặp), khử trùng per_crop `(cycle,date,title)` / shared `(block,date,title)`, `assign_tasks`, hook `crop_cycle_after_insert`, tham số `cycle=`.
- `complete_task` chỉ `db_set("completed_on", today)` — bỏ gọi generate_tasks. Bỏ hàm `_prereq_anchor`.
- `planned_starts` là hàm THUẦN (dùng `datetime.timedelta`, không import frappe) → test trên host.
- Chữ tiếng Việt giữ đúng dấu (UTF-8). Sửa DocType json → `bench migrate`.
- Test Frappe: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module <mod>'`.
- Test thuần (host): `cd backend/akf_farm && python -m pytest akf_farm/engine/test_task_generator.py -q`.
- Frontend (host): `cd frontend && npx tsc --noEmit 2>&1 | grep -E "ProcessManagement"` (rỗng = OK).
- Commit ASCII, không ký tự `"`. Backend bind-mount live.

---

## File Structure

- `.../doctype/cultivation_step/cultivation_step.json` — thêm `estimated_days`. (Modify)
- `akf_farm/engine/task_generator.py` — `planned_starts`; rewrite generate_tasks; xóa `_prereq_anchor`. (Modify)
- `akf_farm/engine/test_task_generator.py` — test thuần `planned_starts`. (Modify)
- `akf_farm/engine/test_phased_generation.py` — sửa test sang forecast. (Modify)
- `akf_farm/api/field_api.py` — `complete_task` đơn giản hoá. (Modify)
- `akf_farm/api/admin_api.py` — `_apply_steps` + `list_processes`. (Modify)
- `frontend/src/components/admin/ProcessManagement.tsx` — ô estimated_days. (Modify)

---

## Task 1: DocType `estimated_days` + migrate

**Files:**
- Modify: `backend/akf_farm/akf_farm/akf_farm/doctype/cultivation_step/cultivation_step.json`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py`

**Interfaces:**
- Produces: `Cultivation Step.estimated_days` (Int, default 1).

- [ ] **Step 1: Viết test thất bại — thêm vào `engine/test_phased_generation.py`**

```python
class TestEstimatedDaysField(FrappeTestCase):
    def test_estimated_days_default_and_store(self):
        if frappe.db.exists("Cultivation Process", "QT ED"):
            frappe.delete_doc("Cultivation Process", "QT ED", force=True)
        p = frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "QT ED", "crop": "Gấc",
            "steps": [
                {"step": 1, "description": "A", "frequency_type": "daily"},
                {"step": 2, "description": "B", "frequency_type": "one_time", "estimated_days": 3},
            ],
        }).insert()
        self.assertEqual(p.steps[0].estimated_days, 1)
        self.assertEqual(p.steps[1].estimated_days, 3)
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — `estimated_days` chưa có.

- [ ] **Step 3: Sửa `cultivation_step.json`**

Thêm `"estimated_days"` vào `field_order` (sau `times_per_period`) và field object:
```json
  {
   "default": "1",
   "fieldname": "estimated_days",
   "fieldtype": "Int",
   "label": "Số ngày ước lượng hoàn thành"
  }
```

- [ ] **Step 4: Migrate**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost migrate'`
Expected: migrate xong, cột `estimated_days` thêm (default 1).

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/akf_farm/akf_farm/akf_farm/doctype/cultivation_step/cultivation_step.json backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: them field estimated_days cho Cultivation Step"
```

---

## Task 2: Hàm thuần `planned_starts`

**Files:**
- Modify: `backend/akf_farm/akf_farm/engine/task_generator.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_task_generator.py`

**Interfaces:**
- Produces: `planned_starts(steps, start_date) -> dict[str, date]`. `steps` = list dict (description, prerequisite, frequency_type, frequency_value, offset_days, estimated_days). Trả {description: ngày bắt đầu dự kiến}.

- [ ] **Step 1: Viết test thất bại — thêm vào `engine/test_task_generator.py`**

```python
from akf_farm.engine.task_generator import planned_starts


class TestPlannedStarts(unittest.TestCase):
    def d(self, s):
        return dt.date.fromisoformat(s)

    def test_chain_one_day_each(self):
        steps = [
            {"description": "A", "frequency_type": "one_time"},
            {"description": "B", "frequency_type": "one_time", "prerequisite": "A"},
            {"description": "C", "frequency_type": "one_time", "prerequisite": "B"},
        ]
        ps = planned_starts(steps, self.d("2026-01-01"))
        self.assertEqual(ps["A"], self.d("2026-01-01"))
        self.assertEqual(ps["B"], self.d("2026-01-02"))
        self.assertEqual(ps["C"], self.d("2026-01-03"))

    def test_estimated_days_pushes_next(self):
        steps = [
            {"description": "A", "frequency_type": "one_time", "estimated_days": 3},
            {"description": "B", "frequency_type": "one_time", "prerequisite": "A"},
        ]
        ps = planned_starts(steps, self.d("2026-01-01"))
        self.assertEqual(ps["B"], self.d("2026-01-04"))  # A finish 01-03, +1

    def test_n_per_period_duration_is_period(self):
        steps = [
            {"description": "A", "frequency_type": "n_per_period", "frequency_value": 2},
            {"description": "B", "frequency_type": "one_time", "prerequisite": "A"},
        ]
        ps = planned_starts(steps, self.d("2026-01-01"))
        self.assertEqual(ps["B"], self.d("2026-01-03"))  # A finish 01-02, +1

    def test_offset_adds(self):
        steps = [
            {"description": "A", "frequency_type": "one_time"},
            {"description": "B", "frequency_type": "daily", "prerequisite": "A", "offset_days": 5},
        ]
        ps = planned_starts(steps, self.d("2026-01-01"))
        self.assertEqual(ps["B"], self.d("2026-01-07"))  # A finish 01-01, +1 +5

    def test_cyclic_prereq_falls_back(self):
        steps = [
            {"description": "A", "frequency_type": "one_time", "prerequisite": "B"},
            {"description": "B", "frequency_type": "one_time", "prerequisite": "A"},
        ]
        ps = planned_starts(steps, self.d("2026-01-01"))
        self.assertEqual(ps["B"], self.d("2026-01-01"))
        self.assertEqual(ps["A"], self.d("2026-01-02"))
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd backend/akf_farm && python -m pytest akf_farm/engine/test_task_generator.py -k PlannedStarts -q`
Expected: FAIL — `planned_starts` chưa tồn tại.

- [ ] **Step 3: Thêm `planned_starts` vào `task_generator.py`** (đặt sau `compute_mandays`, trước `due_dates`)

```python
def planned_starts(steps, start_date):
    """Tính ngày bắt đầu DỰ KIẾN cho mỗi bước theo chuỗi tiên quyết. Hàm thuần.

    steps: list dict (description, prerequisite, frequency_type, frequency_value,
    offset_days, estimated_days). Trả {description: date}.
    """
    by_desc = {s["description"]: s for s in steps}

    def est_days(s):
        ft = s.get("frequency_type")
        if ft == "n_per_period":
            return max(1, int(s.get("frequency_value") or 1))
        if ft == "daily":
            return 1
        return max(1, int(s.get("estimated_days") or 1))  # one_time / khác

    memo = {}

    def start_of(desc, stack):
        if desc in memo:
            return memo[desc]
        s = by_desc[desc]
        prereq = s.get("prerequisite")
        if prereq and prereq in by_desc and prereq not in stack:
            ps = start_of(prereq, stack | {desc})
            finish = ps + dt.timedelta(days=est_days(by_desc[prereq]) - 1)
            base = finish + dt.timedelta(days=1)
        else:
            base = start_date
        val = base + dt.timedelta(days=int(s.get("offset_days") or 0))
        memo[desc] = val
        return val

    return {s["description"]: start_of(s["description"], set()) for s in steps}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd backend/akf_farm && python -m pytest akf_farm/engine/test_task_generator.py -k PlannedStarts -q`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/engine/task_generator.py backend/akf_farm/akf_farm/engine/test_task_generator.py
git commit -m "feat: planned_starts tinh ngay du kien theo chuoi tien quyet"
```

---

## Task 3: `generate_tasks` forecast + bỏ gating + `complete_task`

**Files:**
- Modify: `backend/akf_farm/akf_farm/engine/task_generator.py`
- Modify: `backend/akf_farm/akf_farm/api/field_api.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py`

**Interfaces:**
- Consumes: `planned_starts`, `due_dates`, `dedupe_shared`, `compute_mandays`, `assign_tasks`.
- Produces: `generate_tasks` neo bước vào ngày dự kiến (không gating); `complete_task` chỉ ghi completed_on.

- [ ] **Step 1: Sửa test sinh việc — `engine/test_phased_generation.py`**

(a) **Thay** method `TestExplicitGeneration.test_prereq_gates_and_anchors` bằng:
```python
    def test_prereq_forecast_anchored(self):
        _proc("QT PR", [
            {"step": 1, "description": "Gieo PR", "frequency_type": "one_time", "scope": "per_crop"},
            {"step": 2, "description": "Tưới PR", "frequency_type": "daily", "scope": "per_crop",
             "prerequisite": "Gieo PR"},
        ])
        _block("B PR")
        name = _cycle("B PR", "QT PR")
        today = getdate()
        # forecast: Gieo hôm nay; Tưới bắt đầu ngày mai (Gieo est=1 -> finish hôm nay, +1)
        self.assertTrue(_has(name, "Gieo PR", today))
        self.assertFalse(_has(name, "Tưới PR", today))
        self.assertTrue(_has(name, "Tưới PR", add_days(today, 1)))
```

(b) **Thay** `TestCompleteSetsCompletedOn.test_complete_sets_completed_on_and_unlocks` bằng:
```python
    def test_complete_sets_completed_on(self):
        _proc("QT CT", [
            {"step": 1, "description": "Gieo CT", "frequency_type": "one_time", "scope": "per_crop"},
        ])
        _block("B CT")
        name = _cycle("B CT", "QT CT")
        today = getdate()
        gieo = frappe.get_all("Farm Task", filters={"cycle": name, "title": "Gieo CT"})[0].name
        field_api.complete_task(gieo)
        self.assertEqual(str(frappe.db.get_value("Farm Task", gieo, "completed_on")), str(today))
```

(c) **Xóa** class `TestPrereqIsolatedAcrossCycles` (tiền đề "gating theo hoàn thành" không còn — forecast luôn sinh; tách chu kỳ vẫn được phủ bởi `test_per_crop_keyed_by_cycle`).

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — generate_tasks còn gating (Tưới PR chưa sinh ở tương lai).

- [ ] **Step 3: Rewrite vòng lặp bước trong `generate_tasks` + xóa `_prereq_anchor`**

Trong `task_generator.py`, **xóa** hàm `_prereq_anchor` (dòng ~4-17).

Thay khối `for s in proc.steps:` (phần neo + gating) bằng:
```python
        steps = list(proc.steps)
        planned = planned_starts(
            [{"description": s.description, "prerequisite": s.prerequisite,
              "frequency_type": s.frequency_type, "frequency_value": s.frequency_value,
              "offset_days": s.offset_days, "estimated_days": s.estimated_days} for s in steps],
            start,
        )
        for s in steps:
            freq = (s.frequency_type, s.frequency_value) if s.frequency_type else ("one_time", 1)
            anchor = planned[s.description]
            times = max(1, int(s.times_per_period or 1)) if s.frequency_type == "n_per_period" else 1
            for d in due_dates(anchor, freq, from_d, window_end):
                for k in range(times):
                    title = s.description if times == 1 else f"{s.description} (lần {k + 1}/{times})"
                    rows.append({
                        "cycle": c.name, "block": c.block, "crop": c.crop, "date": d,
                        "description": title, "scope": s.scope, "require_photo": s.require_photo,
                        "mandays": compute_mandays(s.mandays_per_ha, area_of[c.block]),
                    })
```

- [ ] **Step 4: Đơn giản hoá `complete_task` trong `field_api.py`**

Xóa dòng import `from akf_farm.engine.task_generator import generate_tasks` (không còn dùng).
Thay khối sau `doc.save()`:
```python
    doc.db_set("completed_on", str(getdate()))
    if doc.cycle:
        generate_tasks(cycle=doc.cycle)
    return {"ok": True}
```
bằng:
```python
    doc.db_set("completed_on", str(getdate()))
    return {"ok": True}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'` → PASS.
Run: `cd backend/akf_farm && python -m pytest akf_farm/engine/test_task_generator.py -q` → PASS.
Kiểm tra không còn tham chiếu: `grep -rn "_prereq_anchor" backend/akf_farm/akf_farm` → rỗng.

- [ ] **Step 6: Commit**

```bash
git add backend/akf_farm/akf_farm/engine/task_generator.py backend/akf_farm/akf_farm/api/field_api.py backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: generate_tasks dung ngay du kien (forecast), bo gating + _prereq_anchor"
```

---

## Task 4: API `estimated_days`

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/admin_api.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py`

**Interfaces:**
- Produces: `_apply_steps` lưu `estimated_days`; `list_processes` trả `estimatedDays`.

- [ ] **Step 1: Viết test thất bại — thêm vào `engine/test_phased_generation.py`**

```python
class TestEstimatedApi(FrappeTestCase):
    def test_create_list_estimated_days(self):
        if frappe.db.exists("Cultivation Process", "QT EDAPI"):
            frappe.delete_doc("Cultivation Process", "QT EDAPI", force=True)
        admin_api.create_process(process_name="QT EDAPI", crop="Gấc", steps=[
            {"description": "Ngâm ủ", "frequencyType": "one_time", "scopeRaw": "per_crop", "estimatedDays": 3},
            {"description": "Tưới", "frequencyType": "daily", "scopeRaw": "per_crop"},
        ])
        doc = frappe.get_doc("Cultivation Process", "QT EDAPI")
        self.assertEqual(doc.steps[0].estimated_days, 3)
        self.assertEqual(doc.steps[1].estimated_days, 1)
        listed = [p for p in admin_api.list_processes() if p["id"] == "QT EDAPI"][0]
        self.assertEqual(listed["steps"][0]["estimatedDays"], 3)
        self.assertEqual(listed["steps"][1]["estimatedDays"], 1)
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — estimated_days không lưu/trả.

- [ ] **Step 3: Sửa `_apply_steps` + `list_processes` trong `admin_api.py`**

`_apply_steps` — thêm vào dict step:
```python
            "estimated_days": max(1, int(s.get("estimatedDays") or 1)),
```

`list_processes` — step dict thêm:
```python
            "estimatedDays": s.estimated_days or 1,
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/admin_api.py backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: API luu/tra estimated_days"
```

---

## Task 5: Frontend — ô "Số ngày ước lượng" (chỉ khi 1 lần/chu kỳ)

**Files:**
- Modify: `frontend/src/components/admin/ProcessManagement.tsx`

**Interfaces:**
- Consumes: `list_processes` trả `estimatedDays`; create/update step nhận `estimatedDays`.

- [ ] **Step 1: Step interface + emptyStep + toApiSteps**

`Step` interface — thêm `estimatedDays: number`:
```ts
interface Step { step: number; description: string; workPerHa: number; frequency: string; frequencyType: string; frequencyValue: number; timesPerPeriod: number; estimatedDays: number; scope: string; scopeRaw: string; requirePhoto: boolean; offsetDays: number; prerequisite: string; }
```

`emptyStep` — thêm `estimatedDays: 1`:
```ts
const emptyStep = (): Step => ({ step: 0, description: "", workPerHa: 0, frequency: "", frequencyType: "daily", frequencyValue: 1, timesPerPeriod: 1, estimatedDays: 1, scope: "", scopeRaw: "shared", requirePhoto: false, offsetDays: 0, prerequisite: "" });
```

`toApiSteps` — thêm `estimatedDays: s.estimatedDays`:
```ts
const toApiSteps = (steps: Step[]) =>
  steps.map((s) => ({ description: s.description, workPerHa: s.workPerHa, frequencyType: s.frequencyType,
    frequencyValue: s.frequencyValue, timesPerPeriod: s.timesPerPeriod, estimatedDays: s.estimatedDays,
    scopeRaw: s.scopeRaw, requirePhoto: s.requirePhoto, offsetDays: s.offsetDays, prerequisite: s.prerequisite }));
```

- [ ] **Step 2: StepForm — ô estimated_days chỉ khi one_time**

Trong `StepForm`, ngay sau khối `{form.frequencyType === "n_per_period" && (...)}`, thêm:
```tsx
      {form.frequencyType === "one_time" && (
        <Field label="Số ngày ước lượng hoàn thành">
          <input type="number" min={1} value={form.estimatedDays || ""}
            onChange={(e) => setForm({ ...form, estimatedDays: Math.max(1, Number(e.target.value)) })} className={inputCls} />
        </Field>
      )}
```

- [ ] **Step 3: Kiểm tra biên dịch (scoped)**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "ProcessManagement"`
Expected: KHÔNG có dòng nào.

- [ ] **Step 4: Kiểm tra tay trên dev**

- Mở `http://localhost:8080` → Quản lý quy trình → Thêm bước.
- Chọn "1 lần/chu kỳ" → hiện ô "Số ngày ước lượng hoàn thành"; chọn loại khác → ẩn.
- Tạo quy trình có chuỗi tiên quyết → tạo chu kỳ → lịch 10 ngày có việc rải các ngày khác nhau.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/ProcessManagement.tsx
git commit -m "feat: form quy trinh them o So ngay uoc luong (chi khi 1 lan/chu ky)"
```

---

## Self-Review (đã thực hiện khi viết plan)

**Spec coverage:**
- estimated_days field (one_time) → Task 1 + Task 5 (UI). ✓
- est_days derivation + planned_starts (cycle-safe) → Task 2. ✓
- generate_tasks forecast anchor, bỏ gating + _prereq_anchor → Task 3. ✓
- complete_task chỉ set completed_on → Task 3. ✓
- API estimatedDays → Task 4. ✓
- Sửa test cũ (gating → forecast), xóa TestPrereqIsolatedAcrossCycles → Task 3. ✓
- Giữ times_per_period/cycle_length/dedup/scoped cycle → Task 3 (giữ nguyên). ✓

**Type consistency:** `estimated_days` (snake) ↔ `estimatedDays` (camel); `planned_starts(steps, start_date)->dict[str,date]`; generate_tasks dùng `planned[s.description]`; est_days dùng frequency_value cho n_per_period, estimated_days cho one_time — nhất quán giữa planned_starts (engine) và spec.

**Placeholder scan:** Không có TBD/TODO; mọi step có code/lệnh cụ thể.
