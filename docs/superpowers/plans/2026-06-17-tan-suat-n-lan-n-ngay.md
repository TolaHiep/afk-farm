# Tần suất "N lần / N ngày" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay 2 loại tần suất `every_n_days` + `n_per_day` bằng một loại `n_per_period` = "X lần mỗi Y ngày"; "2 lần/ngày" sinh đúng 2 task/ngày.

**Architecture:** `frequency_value` = Y (số ngày 1 chu kỳ lặp); thêm `times_per_period` = X (số lần/ngày-mốc). `generate_tasks` nhân mỗi ngày-đến-hạn ra X task có hậu tố "(lần i/X)". Giữ `daily` + `one_time`.

**Tech Stack:** Frappe v15 / Python (engine + API); React 18 + TS (frontend).

## Global Constraints

- `frequency_type` chỉ còn 3 giá trị: `one_time`, `daily`, `n_per_period`.
- `frequency_value` (Int, default 1) = **Y** (số ngày) cho n_per_period; daily/one_time bỏ qua.
- `times_per_period` (Int, default 1) = **X** (số lần mỗi ngày-mốc); daily/one_time = 1.
- Sinh việc n_per_period: cứ mỗi Y ngày → X task; X>1 → title hậu tố "(lần i/X)" (i=1..X), X=1 → title = mô tả gốc. Mỗi task có công riêng.
- Khử trùng giữ nguyên: per_crop (cycle, date, title); shared (block, date, title) — title đã phân biệt theo lần.
- Di trú: every_n_days(N) → n_per_period (value=N, times=1); n_per_day(N) → n_per_period (value=1, times=N).
- Hạn chế đã biết: `prerequisite` nên trỏ tới bước 1-lần (one_time, không hậu tố) — prereq trỏ tới bước nhiều-lần sẽ không khớp title. Không xử lý (YAGNI).
- Excel đang ẩn nhưng vẫn cập nhật `parse_frequency` cho nhất quán.
- Sửa DocType json → `bench migrate`. Chữ tiếng Việt giữ đúng dấu (UTF-8).
- Test Frappe: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module <mod>'`.
- Test thuần (host): `cd backend/akf_farm && python -m pytest akf_farm/engine/<file> -q`.
- Frontend (host): `cd frontend && npx tsc --noEmit 2>&1 | grep -E "ProcessManagement"` (rỗng = OK).
- Commit ASCII, không ký tự `"`. Backend bind-mount live.

---

## File Structure

- `.../doctype/cultivation_step/cultivation_step.json` — frequency_type options + thêm `times_per_period`. (Modify)
- `akf_farm/engine/task_generator.py` — due_dates (bỏ n_per_day khỏi nhánh daily) + generate_tasks (nhân X task). (Modify)
- `akf_farm/engine/test_task_generator.py` — đổi test n_per_day → n_per_period. (Modify)
- `akf_farm/engine/test_phased_generation.py` — thêm test n_per_period. (Modify)
- `akf_farm/engine/frequency.py` — parse_frequency trả 3-tuple. (Modify)
- `akf_farm/engine/test_frequency.py` — cập nhật kỳ vọng 3-tuple. (Modify)
- `akf_farm/api/sheet_import.py` — import_rows nhận times. (Modify)
- `akf_farm/api/test_sheet_import.py` — cập nhật kỳ vọng n_per_period. (Modify)
- `akf_farm/api/admin_api.py` — _apply_steps, list_processes, _freq_text. (Modify)
- `frontend/src/components/admin/ProcessManagement.tsx` — FREQ_OPTIONS, Step, StepForm, bảng. (Modify)

---

## Task 1: DocType — frequency options + `times_per_period` + di trú

**Files:**
- Modify: `backend/akf_farm/akf_farm/akf_farm/doctype/cultivation_step/cultivation_step.json`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py`

**Interfaces:**
- Produces: `Cultivation Step.frequency_type` options `one_time/daily/n_per_period`; `Cultivation Step.times_per_period` (Int default 1).

- [ ] **Step 1: Viết test thất bại — thêm class vào `engine/test_phased_generation.py`**

```python
class TestFreqFields(FrappeTestCase):
    def test_times_per_period_field_and_default(self):
        if frappe.db.exists("Cultivation Process", "QT TPP"):
            frappe.delete_doc("Cultivation Process", "QT TPP", force=True)
        p = frappe.get_doc({
            "doctype": "Cultivation Process", "process_name": "QT TPP", "crop": "Gấc",
            "steps": [
                {"step": 1, "description": "A", "frequency_type": "daily"},
                {"step": 2, "description": "B", "frequency_type": "n_per_period",
                 "frequency_value": 1, "times_per_period": 2},
            ],
        }).insert()
        self.assertEqual(p.steps[0].times_per_period, 1)   # default
        self.assertEqual(p.steps[1].times_per_period, 2)
        self.assertEqual(p.steps[1].frequency_type, "n_per_period")
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — `times_per_period` chưa có / `n_per_period` không phải option hợp lệ.

- [ ] **Step 3: Sửa `cultivation_step.json`**

Đổi options của `frequency_type`:
```json
   "options": "one_time\ndaily\nn_per_period"
```
Thêm `"times_per_period"` vào `field_order` (sau `frequency_value`) và field object:
```json
  {
   "default": "1",
   "fieldname": "times_per_period",
   "fieldtype": "Int",
   "label": "Số lần mỗi chu kỳ lặp"
  }
```

- [ ] **Step 4: Migrate**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost migrate'`
Expected: migrate xong, cột `times_per_period` thêm.

- [ ] **Step 5: Di trú dữ liệu cũ (script một lần)**

Tạo `/tmp/akf_freq_fix.py`:
```python
import frappe
frappe.init(site="akf.localhost")
frappe.connect()
# n_per_day(N) -> n_per_period: times=N, period=1
frappe.db.sql("update `tabCultivation Step` set times_per_period=frequency_value, frequency_value=1, frequency_type='n_per_period' where frequency_type='n_per_day'")
# every_n_days(N) -> n_per_period: times=1, period=N
frappe.db.sql("update `tabCultivation Step` set times_per_period=1, frequency_type='n_per_period' where frequency_type='every_n_days'")
frappe.db.commit()
print("freq migrate done")
```
Run:
```bash
docker compose cp /tmp/akf_freq_fix.py backend:/tmp/akf_freq_fix.py
docker compose exec backend bash -lc 'cd /home/frappe/frappe-bench/sites && ../env/bin/python /tmp/akf_freq_fix.py'
```
Expected: "freq migrate done".

- [ ] **Step 6: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/akf_farm/akf_farm/akf_farm/doctype/cultivation_step/cultivation_step.json backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: frequency_type n_per_period + times_per_period; di tru du lieu cu"
```

---

## Task 2: Engine — generate_tasks nhân X task + due_dates

**Files:**
- Modify: `backend/akf_farm/akf_farm/engine/task_generator.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_task_generator.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py`

**Interfaces:**
- Consumes: `due_dates`, `compute_mandays`, `dedupe_shared`.
- Produces: `generate_tasks` sinh `times_per_period` task mỗi ngày-đến-hạn cho `n_per_period`, title hậu tố "(lần i/X)".

- [ ] **Step 1: Cập nhật test thuần `engine/test_task_generator.py`**

Thay `test_n_per_day_one_per_day_at_date_level` bằng:
```python
    def test_n_per_period_steps_by_period(self):
        # n_per_period period=2 -> mỗi 2 ngày 1 occurrence (số lần/ngày xử lý ở generate_tasks)
        out = due_dates(self.d("2026-01-01"), ("n_per_period", 2), self.d("2026-01-01"), self.d("2026-01-05"))
        self.assertEqual(out, [self.d("2026-01-01"), self.d("2026-01-03"), self.d("2026-01-05")])
```

- [ ] **Step 2: Thêm test sinh việc — `engine/test_phased_generation.py`**

```python
class TestNPerPeriodGeneration(FrappeTestCase):
    def test_two_per_day_makes_two_tasks(self):
        _proc("QT 2D", [
            {"step": 1, "description": "Tưới 2D", "frequency_type": "n_per_period",
             "frequency_value": 1, "times_per_period": 2, "scope": "per_crop"},
        ])
        _block("B 2D")
        name = _cycle("B 2D", "QT 2D")
        today = getdate()
        self.assertTrue(_has(name, "Tưới 2D (lần 1/2)", today))
        self.assertTrue(_has(name, "Tưới 2D (lần 2/2)", today))
        self.assertFalse(_has(name, "Tưới 2D", today))  # không có task không hậu tố

    def test_every_n_days_single_task(self):
        _proc("QT 3N", [
            {"step": 1, "description": "Bón 3N", "frequency_type": "n_per_period",
             "frequency_value": 3, "times_per_period": 1, "scope": "per_crop"},
        ])
        _block("B 3N")
        name = _cycle("B 3N", "QT 3N")
        today = getdate()
        self.assertTrue(_has(name, "Bón 3N", today))            # X=1 -> không hậu tố
        self.assertFalse(_has(name, "Bón 3N", add_days(today, 1)))
        self.assertTrue(_has(name, "Bón 3N", add_days(today, 3)))  # mỗi 3 ngày
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

Run thuần: `cd backend/akf_farm && python -m pytest akf_farm/engine/test_task_generator.py -k n_per_period -q` → FAIL (due_dates n_per_period chưa rõ — thực ra else branch xử lý, có thể PASS; nếu PASS thì bỏ qua).
Run Frappe: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — chưa nhân X task (chỉ 1 task/ngày, không hậu tố).

- [ ] **Step 4: Sửa `due_dates` + `generate_tasks` trong `task_generator.py`**

Trong `due_dates`, đổi dòng:
```python
    step = 1 if ftype in ("daily", "n_per_day") else fval
```
thành:
```python
    step = 1 if ftype == "daily" else fval
```

Trong `generate_tasks`, thay khối `for d in due_dates(...)` (chỗ append rows) bằng:
```python
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

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'` → PASS.
Run: `cd backend/akf_farm && python -m pytest akf_farm/engine/test_task_generator.py -q` → PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/akf_farm/akf_farm/engine/task_generator.py backend/akf_farm/akf_farm/engine/test_task_generator.py backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: n_per_period sinh X task/ngay (hau to lan i/X)"
```

---

## Task 3: `parse_frequency` 3-tuple + import_rows (Excel dormant)

**Files:**
- Modify: `backend/akf_farm/akf_farm/engine/frequency.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_frequency.py`
- Modify: `backend/akf_farm/akf_farm/api/sheet_import.py`
- Modify: `backend/akf_farm/akf_farm/api/test_sheet_import.py`

**Interfaces:**
- Produces: `parse_frequency(text) -> (frequency_type, value, times)`; `import_rows` set `times_per_period`.

- [ ] **Step 1: Cập nhật test thuần `engine/test_frequency.py`** — đổi kỳ vọng sang 3-tuple

```python
import unittest
from akf_farm.engine.frequency import parse_frequency


class TestParseFrequency(unittest.TestCase):
    def test_one_time(self):
        self.assertEqual(parse_frequency("1 lần/chu kỳ"), ("one_time", 1, 1))

    def test_daily(self):
        self.assertEqual(parse_frequency("Hàng ngày"), ("daily", 1, 1))

    def test_n_per_day(self):
        self.assertEqual(parse_frequency("2 lần/ngày"), ("n_per_period", 1, 2))

    def test_every_n_days(self):
        self.assertEqual(parse_frequency("20 ngày/lần"), ("n_per_period", 20, 1))

    def test_n_years(self):
        self.assertEqual(parse_frequency("1 lần/20 năm"), ("n_per_period", 7300, 1))

    def test_default_one_time(self):
        self.assertEqual(parse_frequency("không rõ"), ("one_time", 1, 1))
```

(Nếu file cũ có test khác, thay bằng nội dung trên.)

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd backend/akf_farm && python -m pytest akf_farm/engine/test_frequency.py -q`
Expected: FAIL — parse_frequency đang trả 2-tuple.

- [ ] **Step 3: Sửa `frequency.py`** — trả 3-tuple `(type, value, times)`

```python
import re


def parse_frequency(text: str):
    """Trả (frequency_type, value, times). value=số ngày chu kỳ (Y), times=số lần (X). Mặc định one_time."""
    t = (text or "").strip().lower()
    if "chu kỳ" in t or "1 lần/chu" in t:
        return ("one_time", 1, 1)
    if "hàng ngày" in t:
        return ("daily", 1, 1)
    m = re.search(r"(\d+)\s*lần\s*/\s*ngày", t)
    if m:
        return ("n_per_period", 1, int(m.group(1)))
    m = re.search(r"\d+\s*lần\s*/\s*(\d+)\s*năm", t)
    if m:
        return ("n_per_period", int(m.group(1)) * 365, 1)
    m = re.search(r"(\d+)\s*năm\s*/\s*lần", t)
    if m:
        return ("n_per_period", int(m.group(1)) * 365, 1)
    m = re.search(r"(\d+)\s*ngày\s*/\s*lần", t)
    if m:
        n = int(m.group(1))
        return ("daily", 1, 1) if n == 1 else ("n_per_period", n, 1)
    return ("one_time", 1, 1)
```

- [ ] **Step 4: Sửa `import_rows` trong `sheet_import.py`**

Tìm dòng `ftype, fval = parse_frequency(...)` → đổi thành `ftype, fval, ftimes = parse_frequency(...)`.
Trong `steps.append({...})` thêm: `"times_per_period": ftimes,` (cạnh `"frequency_value": fval`).

- [ ] **Step 5: Cập nhật `api/test_sheet_import.py`**

Trong test cũ assert `frequency_type == "every_n_days"` cho "2 ngày/lần" → đổi:
```python
        self.assertEqual(doc.steps[1].frequency_type, "n_per_period")
        self.assertEqual(doc.steps[1].frequency_value, 2)
        self.assertEqual(doc.steps[1].times_per_period, 1)
```
(Tìm assertion liên quan `every_n_days` trong file và sửa cho khớp.)

- [ ] **Step 6: Chạy test để xác nhận PASS**

Run: `cd backend/akf_farm && python -m pytest akf_farm/engine/test_frequency.py -q` → PASS.
Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_sheet_import'` → PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/akf_farm/akf_farm/engine/frequency.py backend/akf_farm/akf_farm/engine/test_frequency.py backend/akf_farm/akf_farm/api/sheet_import.py backend/akf_farm/akf_farm/api/test_sheet_import.py
git commit -m "feat: parse_frequency 3-tuple (type,value,times) + import_rows times_per_period"
```

---

## Task 4: API — _apply_steps + list_processes + _freq_text

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/admin_api.py`
- Modify: `backend/akf_farm/akf_farm/engine/test_phased_generation.py`

**Interfaces:**
- Produces: `_apply_steps` lưu `times_per_period`; `list_processes` trả `timesPerPeriod` + `frequency` text "X lần / Y ngày".

- [ ] **Step 1: Viết test thất bại — thêm vào `engine/test_phased_generation.py`**

```python
class TestFreqApi(FrappeTestCase):
    def test_create_list_times_per_period(self):
        if frappe.db.exists("Cultivation Process", "QT FAPI"):
            frappe.delete_doc("Cultivation Process", "QT FAPI", force=True)
        admin_api.create_process(process_name="QT FAPI", crop="Gấc", steps=[
            {"description": "Tưới", "frequencyType": "n_per_period", "frequencyValue": 1,
             "timesPerPeriod": 2, "scopeRaw": "per_crop"},
        ])
        doc = frappe.get_doc("Cultivation Process", "QT FAPI")
        self.assertEqual(doc.steps[0].times_per_period, 2)
        listed = [p for p in admin_api.list_processes() if p["id"] == "QT FAPI"][0]
        self.assertEqual(listed["steps"][0]["timesPerPeriod"], 2)
        self.assertEqual(listed["steps"][0]["frequency"], "2 lần / 1 ngày")
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: FAIL — times_per_period không lưu/trả; frequency text sai.

- [ ] **Step 3: Sửa `_apply_steps` + `_freq_text` + `list_processes` trong `admin_api.py`**

`_apply_steps` — thêm vào dict step:
```python
            "times_per_period": max(1, int(s.get("timesPerPeriod") or 1)),
```

`_freq_text` — đổi thành:
```python
def _freq_text(ftype, fval, times=1):
    fval = int(fval or 1)
    times = int(times or 1)
    if ftype == "one_time":
        return "1 lần/chu kỳ"
    if ftype == "daily":
        return "Hàng ngày"
    if ftype == "n_per_period":
        return f"{times} lần / {fval} ngày"
    return "1 lần/chu kỳ"
```

`list_processes` — step dict: đổi `"frequency": _freq_text(s.frequency_type, s.frequency_value)` thành `"frequency": _freq_text(s.frequency_type, s.frequency_value, s.times_per_period)` và thêm `"timesPerPeriod": s.times_per_period or 1`.

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.engine.test_phased_generation'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/admin_api.py backend/akf_farm/akf_farm/engine/test_phased_generation.py
git commit -m "feat: API luu/tra times_per_period + _freq_text X lan / Y ngay"
```

---

## Task 5: Frontend — FREQ_OPTIONS + StepForm 2 ô + bảng

**Files:**
- Modify: `frontend/src/components/admin/ProcessManagement.tsx`

**Interfaces:**
- Consumes: list_processes trả `timesPerPeriod` + `frequency` text; create/update step nhận `timesPerPeriod`.

- [ ] **Step 1: FREQ_OPTIONS + Step interface + emptyStep + toApiSteps**

`FREQ_OPTIONS`:
```ts
const FREQ_OPTIONS: { value: string; label: string }[] = [
  { value: "one_time", label: "1 lần/chu kỳ" },
  { value: "daily", label: "Hàng ngày" },
  { value: "n_per_period", label: "N lần / N ngày" },
];
```

`Step` interface — thêm `timesPerPeriod: number`:
```ts
interface Step { step: number; description: string; workPerHa: number; frequency: string; frequencyType: string; frequencyValue: number; timesPerPeriod: number; scope: string; scopeRaw: string; requirePhoto: boolean; offsetDays: number; prerequisite: string; }
```

`emptyStep` — thêm `timesPerPeriod: 1`:
```ts
const emptyStep = (): Step => ({ step: 0, description: "", workPerHa: 0, frequency: "", frequencyType: "daily", frequencyValue: 1, timesPerPeriod: 1, scope: "", scopeRaw: "shared", requirePhoto: false, offsetDays: 0, prerequisite: "" });
```

`toApiSteps` — thêm `timesPerPeriod: s.timesPerPeriod`:
```ts
const toApiSteps = (steps: Step[]) =>
  steps.map((s) => ({ description: s.description, workPerHa: s.workPerHa, frequencyType: s.frequencyType,
    frequencyValue: s.frequencyValue, timesPerPeriod: s.timesPerPeriod, scopeRaw: s.scopeRaw,
    requirePhoto: s.requirePhoto, offsetDays: s.offsetDays, prerequisite: s.prerequisite }));
```

- [ ] **Step 2: StepForm — 2 ô khi chọn n_per_period**

Thay khối `{(form.frequencyType === "every_n_days" || form.frequencyType === "n_per_day") && (...)}` bằng:
```tsx
      {form.frequencyType === "n_per_period" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số lần (X)">
            <input type="number" min={1} value={form.timesPerPeriod || ""}
              onChange={(e) => setForm({ ...form, timesPerPeriod: Math.max(1, Number(e.target.value)) })} className={inputCls} />
          </Field>
          <Field label="Mỗi (Y) ngày">
            <input type="number" min={1} value={form.frequencyValue || ""}
              onChange={(e) => setForm({ ...form, frequencyValue: Math.max(1, Number(e.target.value)) })} className={inputCls} />
          </Field>
        </div>
      )}
```

- [ ] **Step 3: Bảng — cột Tần suất dùng text từ API**

Cột "Tần suất" trong bảng (desktop + mobile) hiển thị `step.frequency` (chuỗi từ API, vd "2 lần / 1 ngày"). Nếu hiện tại đã dùng `step.frequency` thì giữ nguyên; nếu đang tự ghép thì đổi sang `step.frequency`.

- [ ] **Step 4: Kiểm tra biên dịch (scoped)**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "ProcessManagement"`
Expected: KHÔNG có dòng nào.

- [ ] **Step 5: Kiểm tra tay trên dev**

- Mở `http://localhost:8080` → Quản lý quy trình → Thêm bước.
- Chọn "N lần / N ngày" → hiện 2 ô "Số lần (X)" + "Mỗi (Y) ngày". Nhập 2 và 1 → lưu.
- Bảng hiển thị Tần suất "2 lần / 1 ngày".
- (Tùy chọn) tạo chu kỳ trên quy trình đó → lịch có 2 task/ngày "(lần 1/2)", "(lần 2/2)".

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/admin/ProcessManagement.tsx
git commit -m "feat: form quy trinh tan suat N lan / N ngay (2 o so lan + so ngay)"
```

---

## Self-Review (đã thực hiện khi viết plan)

**Spec coverage:**
- frequency_type 3 loại + times_per_period field + di trú → Task 1. ✓
- Sinh X task/ngày + hậu tố "(lần i/X)" + due_dates step Y → Task 2. ✓
- parse_frequency 3-tuple + import_rows → Task 3. ✓
- _apply_steps/list_processes/_freq_text → Task 4. ✓
- Frontend FREQ_OPTIONS + StepForm 2 ô + bảng → Task 5. ✓
- Khử trùng theo title (đã phân biệt lần) → Task 2 (giữ logic cũ, title mới). ✓

**Type consistency:** `times_per_period` (snake) ↔ `timesPerPeriod` (camel); `_freq_text(ftype, fval, times)`; `frequency_value`=Y nhất quán; due_dates `(type, value)` với value=Y; generate dùng `s.times_per_period`. parse_frequency 3-tuple cập nhật mọi caller (import_rows + test_frequency).

**Placeholder scan:** Không có TBD/TODO; mọi step có code/lệnh cụ thể.
