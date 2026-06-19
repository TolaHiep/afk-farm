# Chống gian lận ảnh nghiệm thu (camera in-app + GPS + watermark) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Với luồng Hoàn thành việc, ép tổ trưởng chụp ảnh trực tiếp trong app (không chọn file), thu GPS + giờ chụp, đốt watermark lên ảnh; server tự tính cờ "ngoài lô / thiếu GPS" và admin xem được cờ đó.

**Architecture:** Backend thêm metadata-fields cho `Farm Task Photo`, tính cờ GPS tin cậy phía server từ `boundary` của lô, nhận `photo_meta` trong `complete_task`. Frontend tách logic thuần (watermark, meta, cờ) ra `lib/` để test được dưới vitest môi trường `node`; component camera (`CameraCapture`) và phần ghép nối chỉ verify bằng typecheck + build (không unit-test được DOM/canvas/media). Soft-enforcement: luôn cho hoàn thành, chỉ gắn cờ; ngoại lệ duy nhất là việc bắt buộc ảnh mà camera in-app không dùng được → không thêm được ảnh → không hoàn thành.

**Tech Stack:** Frappe v15 (Python), React 18 + Vite + TypeScript, vitest (env `node`), lucide-react, Tailwind.

## Global Constraints

- **Phạm vi:** chỉ luồng `complete_task` (mobile `TaskDetail`). `submit_report`/`submit_support` KHÔNG đổi hành vi ảnh.
- **Camera in-app bắt buộc (hard), không fallback chọn file.** Việc `require_photo=0`: không đổi. Việc `require_photo=1`: chỉ camera in-app thêm được ảnh; camera lỗi/từ chối → không hoàn thành được việc đó.
- **GPS mềm:** thiếu/từ chối → vẫn hoàn thành, cờ `missing`.
- **Ngưỡng cờ `far`:** ngoài polygon VÀ khoảng cách > `50m` (`_GPS_TOLERANCE_M = 50`). Trong polygon → `ok`.
- **Cờ tính ở SERVER** từ `boundary` (GeoJSON Polygon, thứ tự `[lng,lat]`). Client gửi lat/lng/accuracy/capturedAt/inApp thô.
- **Watermark:** `giờ client · GPS "lat,lng" (hoặc "GPS: thiếu") · tên lô`, đốt lên canvas trước khi nén.
- **Nén:** dùng `ONLINE`/`OFFLINE` sẵn có trong `lib/image.ts` (online 1920/0.85, offline 1280/0.8). Trần ảnh `MAX_PHOTOS = 5`.
- **Test backend chạy dưới quyền tổ trưởng** (`frappe.set_user(self.leader)`) — xem memory `frappe-tests-run-as-administrator`. Mặc định Administrator bỏ qua kiểm quyền.
- **Migrate** sau khi đổi DocType: `docker compose exec -T backend bash -lc 'bench --site akf.localhost migrate'`.
- Backend test: `docker compose exec -T backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm'`. Frontend test: `cd frontend && npx vitest run`. Typecheck: `cd frontend && npx tsc --noEmit`. Build: `cd frontend && npx vite build`.
- Commit message KHÔNG dùng dấu `"` (PowerShell làm hỏng commit) — xem memory `git-commit-quotes-powershell`.

---

## File Structure

**Backend**
- `backend/akf_farm/akf_farm/akf_farm/doctype/farm_task_photo/farm_task_photo.json` — thêm 7 field metadata.
- `backend/akf_farm/akf_farm/api/field_api.py` — geo helpers + `_save_photos` trả index + `complete_task` nhận `photo_meta`.
- `backend/akf_farm/akf_farm/api/admin_api.py` — `task_photos` trả object giàu hơn.
- `backend/akf_farm/akf_farm/api/test_api_field.py` — test geo + photo_meta.

**Frontend**
- `frontend/src/lib/capture.ts` (mới) — types `CapturedPhoto`/`PhotoMeta`/`TaskPhoto`/`GpsStatus`/`PhotoFlag` + hàm thuần `toPhotoMeta`, `photoFlag`.
- `frontend/src/lib/capture.test.ts` (mới) — test `toPhotoMeta`, `photoFlag`.
- `frontend/src/lib/watermark.ts` (mới) — `watermarkLines` (thuần) + `drawWatermark` (canvas).
- `frontend/src/lib/watermark.test.ts` (mới) — test `watermarkLines`.
- `frontend/src/components/mobile/CameraCapture.tsx` (mới) — modal camera in-app + GPS + watermark.
- `frontend/src/components/mobile/TaskDetail.tsx` — thay khối ảnh: dùng camera thay file picker.
- `frontend/src/lib/queries.ts` — `completeTask` thêm `photoMeta`; `getTaskPhotos` trả `TaskPhoto[]`.
- `frontend/src/lib/offline.ts` — replay `task` truyền thêm `photo_meta`.
- `frontend/src/components/admin/WorkCalendar.tsx` — modal "Chi tiết" hiện badge cờ.

**Docs**
- `docs/web-system-guide.md`, `docs/huong-dan-su-dung.md`.

---

## Task 1: Backend — geo helpers + Farm Task Photo metadata fields

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/field_api.py` (thêm import + geo helpers gần đầu file, sau `_as_list`)
- Modify: `backend/akf_farm/akf_farm/akf_farm/doctype/farm_task_photo/farm_task_photo.json` (thêm field)
- Test: `backend/akf_farm/akf_farm/api/test_api_field.py`

**Interfaces:**
- Produces: `field_api._geo_flag(block_name: str, lat: float|None, lng: float|None) -> tuple[str, float|None]` trả `("ok"|"far"|"missing", distance_m|None)`. Phụ trợ: `_parse_boundary`, `_point_in_polygon`, `_distance_to_polygon_m`, hằng `_GPS_TOLERANCE_M = 50`.
- Produces: `Farm Task Photo` có thêm field `lat, lng, gps_accuracy, captured_at, gps_status, distance_m, in_app`.

- [ ] **Step 1: Viết test thất bại cho `_geo_flag`**

Thêm vào `test_api_field.py` (trong class `TestFieldApi`), sau `_mk_leader`-based setUp đã có. Thêm hằng boundary + helper tạo lô có ranh giới + test:

```python
    # Polygon vuong ~110m quanh (11.94, 108.458) — GeoJSON [lng,lat], ring khep kin
    _BOUNDARY = (
        '{"type":"Polygon","coordinates":[[[108.4575,11.9395],[108.4585,11.9395],'
        '[108.4585,11.9405],[108.4575,11.9405],[108.4575,11.9395]]]}'
    )

    def _mk_block_with_boundary(self):
        if not frappe.db.exists("Farm Block", "B GEO"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B GEO", "zone": "Z FLD",
                            "area": 10000, "boundary": self._BOUNDARY}).insert(ignore_permissions=True)
        return "B GEO"

    def test_geo_flag(self):
        blk = self._mk_block_with_boundary()
        self.assertEqual(field_api._geo_flag(blk, 11.9400, 108.4580)[0], "ok")        # trong polygon
        self.assertEqual(field_api._geo_flag(blk, 11.94075, 108.4580)[0], "ok")       # ngoai ~27.8m <= 50
        st, dist = field_api._geo_flag(blk, 11.9410, 108.4580)                        # ngoai ~55.7m > 50
        self.assertEqual(st, "far")
        self.assertGreater(dist, 50)
        self.assertEqual(field_api._geo_flag(blk, None, None), ("missing", None))      # khong toa do
        self.assertEqual(field_api._geo_flag("B FLD", 11.94, 108.458), ("missing", None))  # lo khong co boundary
```

- [ ] **Step 2: Chạy test — kỳ vọng FAIL**

Run: `docker compose exec -T backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_api_field' 2>&1 | tail -15`
Expected: FAIL — `AttributeError: module 'akf_farm.api.field_api' has no attribute '_geo_flag'`.

- [ ] **Step 3: Thêm geo helpers vào `field_api.py`**

Sửa dòng import đầu file từ `import base64`/`import json`/`import re` — thêm `import math`. Đầu file hiện có:
```python
import base64
import json
import re

import frappe
from frappe.utils import getdate
```
Đổi thành (thêm `import math`):
```python
import base64
import json
import math
import re

import frappe
from frappe.utils import getdate
```

Thêm khối sau hàm `_as_list` (đã có ở dòng ~55-58):
```python
_GPS_TOLERANCE_M = 50  # ngoai polygon nhung <= 50m van coi la trong lo (dung sai GPS dien thoai)


def _parse_boundary(block_name):
    """Tra mang [(lat, lng)] tu field boundary GeoJSON Polygon; [] neu khong co/loi."""
    raw = frappe.db.get_value("Farm Block", block_name, "boundary")
    if not raw:
        return []
    try:
        obj = json.loads(raw) if isinstance(raw, str) else raw
        ring = obj["coordinates"][0] if obj.get("type") == "Polygon" else None
        pts = [(float(c[1]), float(c[0])) for c in ring if len(c) >= 2]  # dao [lng,lat] -> (lat,lng)
        if len(pts) > 1 and pts[0] == pts[-1]:
            pts.pop()  # bo diem dong vong trung dau
        return pts if len(pts) >= 3 else []
    except Exception:
        return []


def _point_in_polygon(lat, lng, poly):
    """Ray casting tren (lat,lng). poly = [(lat,lng)]."""
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        yi, xi = poly[i]
        yj, xj = poly[j]
        if (yi > lat) != (yj > lat) and lng < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def _distance_to_polygon_m(lat, lng, poly):
    """Khoang cach (m) tu diem toi canh gan nhat cua polygon.

    Chieu equirectangular quanh diem -> met (du chinh xac cho nguong 50m).
    """
    R = 6371000.0
    p = math.pi / 180
    cos_lat = math.cos(lat * p)

    def to_xy(la, ln):
        return ((ln - lng) * p * cos_lat * R, (la - lat) * p * R)

    pts = [to_xy(py, px) for (py, px) in poly]
    best = float("inf")
    n = len(pts)
    for i in range(n):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % n]
        dx, dy = bx - ax, by - ay
        seg2 = dx * dx + dy * dy
        t = 0.0 if seg2 == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / seg2))
        cx, cy = ax + t * dx, ay + t * dy
        best = min(best, math.hypot(cx, cy))
    return best


def _geo_flag(block_name, lat, lng):
    """Tra (gps_status, distance_m). Tin cay phia server (client khong tu quyet co)."""
    if lat is None or lng is None:
        return ("missing", None)
    poly = _parse_boundary(block_name)
    if len(poly) < 3:
        return ("missing", None)  # lo chua ve ranh gioi -> khong kiem tra duoc
    if _point_in_polygon(lat, lng, poly):
        return ("ok", 0.0)
    dist = _distance_to_polygon_m(lat, lng, poly)
    return (("ok" if dist <= _GPS_TOLERANCE_M else "far"), dist)
```

- [ ] **Step 4: Thêm field vào `farm_task_photo.json`**

Thay toàn bộ nội dung file `farm_task_photo.json` bằng:
```json
{
 "actions": [],
 "creation": "2026-06-16 00:00:00",
 "doctype": "DocType",
 "editable_grid": 1,
 "engine": "InnoDB",
 "field_order": [
  "image",
  "lat",
  "lng",
  "gps_accuracy",
  "captured_at",
  "gps_status",
  "distance_m",
  "in_app"
 ],
 "fields": [
  {"fieldname": "image", "fieldtype": "Attach Image", "label": "Ảnh", "in_list_view": 1},
  {"fieldname": "lat", "fieldtype": "Float", "label": "Vĩ độ", "precision": "8"},
  {"fieldname": "lng", "fieldtype": "Float", "label": "Kinh độ", "precision": "8"},
  {"fieldname": "gps_accuracy", "fieldtype": "Float", "label": "Độ chính xác GPS (m)"},
  {"fieldname": "captured_at", "fieldtype": "Datetime", "label": "Giờ chụp (client)"},
  {"fieldname": "gps_status", "fieldtype": "Select", "label": "Trạng thái GPS", "options": "\nok\nfar\nmissing"},
  {"fieldname": "distance_m", "fieldtype": "Float", "label": "Khoảng cách tới lô (m)"},
  {"fieldname": "in_app", "fieldtype": "Check", "label": "Chụp in-app", "default": "0"}
 ],
 "istable": 1,
 "links": [],
 "modified": "2026-06-19 00:00:00",
 "modified_by": "Administrator",
 "module": "Akf Farm",
 "name": "Farm Task Photo",
 "owner": "Administrator",
 "permissions": [],
 "sort_field": "modified",
 "sort_order": "DESC",
 "states": []
}
```

- [ ] **Step 5: Migrate áp field mới**

Run: `docker compose exec -T backend bash -lc 'bench --site akf.localhost migrate' 2>&1 | tail -5`
Expected: kết thúc không lỗi (`Compiling Python files...` / `Queued rebuilding of search index`).

- [ ] **Step 6: Chạy test — kỳ vọng PASS**

Run: `docker compose exec -T backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_api_field' 2>&1 | tail -8`
Expected: OK (test_geo_flag pass; các test cũ vẫn pass).

- [ ] **Step 7: Commit**

```bash
git add backend/akf_farm/akf_farm/api/field_api.py backend/akf_farm/akf_farm/akf_farm/doctype/farm_task_photo/farm_task_photo.json backend/akf_farm/akf_farm/api/test_api_field.py
git commit -m "feat: geo flag GPS lo + them field metadata cho Farm Task Photo"
```

---

## Task 2: Backend — `complete_task` nhận `photo_meta` + `admin_api.task_photos` trả cờ

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/field_api.py` (`_save_photos`, `complete_task`, `submit_report`, `submit_support`)
- Modify: `backend/akf_farm/akf_farm/api/admin_api.py` (`task_photos`)
- Test: `backend/akf_farm/akf_farm/api/test_api_field.py`

**Interfaces:**
- Consumes: `_geo_flag` (Task 1).
- Produces: `_save_photos(parent_doc, photos) -> list[dict]` mỗi phần tử `{"image": str, "idx": int}` (idx = vị trí trong mảng `photos` gốc).
- Produces: `complete_task(task, client_uuid=None, photos=None, photo_meta=None)` — `photo_meta` là JSON list `[{lat,lng,accuracy,capturedAt,inApp}]` khớp index với `photos`.
- Produces: `admin_api.task_photos(task) -> list[dict]` mỗi phần tử `{url, lat, lng, gpsAccuracy, capturedAt, gpsStatus, distanceM, inApp}`.

- [ ] **Step 1: Viết test thất bại cho photo_meta + task_photos**

Thêm vào `test_api_field.py`:
```python
    def test_complete_task_photo_meta_geo_ok(self):
        frappe.set_user(self.leader)
        blk = self._mk_block_with_boundary()
        t = frappe.get_doc({"doctype": "Farm Task", "title": "Tưới", "block": blk, "crop": "Gấc",
                            "task_date": "2026-06-14", "status": "pending", "require_photo": 1,
                            "team_leader": self.leader}).insert(ignore_permissions=True)
        meta = [{"lat": 11.9400, "lng": 108.4580, "accuracy": 8,
                 "capturedAt": "2026-06-19 08:00:00", "inApp": True}]
        field_api.complete_task(t.name, client_uuid="g1", photos=[self._PNG_1PX], photo_meta=meta)
        row = frappe.get_doc("Farm Task", t.name).photos[0]
        self.assertEqual(row.gps_status, "ok")
        self.assertEqual(row.in_app, 1)
        self.assertAlmostEqual(row.lat, 11.9400, places=4)

    def test_complete_task_photo_missing_gps(self):
        frappe.set_user(self.leader)
        field_api.complete_task(self.t.name, client_uuid="g2", photos=[self._PNG_1PX], photo_meta=[])
        row = frappe.get_doc("Farm Task", self.t.name).photos[0]
        self.assertEqual(row.gps_status, "missing")
        self.assertEqual(row.in_app, 0)

    def test_admin_task_photos_returns_meta(self):
        from akf_farm.api import admin_api
        frappe.set_user(self.leader)
        blk = self._mk_block_with_boundary()
        t = frappe.get_doc({"doctype": "Farm Task", "title": "Tưới", "block": blk, "crop": "Gấc",
                            "task_date": "2026-06-14", "status": "pending", "require_photo": 1,
                            "team_leader": self.leader}).insert(ignore_permissions=True)
        field_api.complete_task(t.name, client_uuid="ap1", photos=[self._PNG_1PX],
                                photo_meta=[{"lat": 11.94, "lng": 108.458, "inApp": True}])
        frappe.set_user("Administrator")
        rows = admin_api.task_photos(t.name)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["gpsStatus"], "ok")
        self.assertTrue(rows[0]["inApp"])
        self.assertTrue(rows[0]["url"].startswith("/private/files/"))
```

- [ ] **Step 2: Chạy test — kỳ vọng FAIL**

Run: `docker compose exec -T backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_api_field' 2>&1 | tail -15`
Expected: FAIL — `complete_task() got an unexpected keyword argument 'photo_meta'` (và/hoặc `gps_status` rỗng).

- [ ] **Step 3: Sửa `_save_photos` trả index gốc**

Trong `field_api.py`, hàm `_save_photos`: đổi biến `urls` thành `rows` và phần tử thành dict kèm idx. Thay:
```python
    urls = []
    created = 0
    for i, p in enumerate(_as_list(photos)):
        if not isinstance(p, str):
            continue
        m = _DATA_URL.match(p)
        if not m:
            urls.append(p)
            continue
```
thành:
```python
    rows = []
    created = 0
    for i, p in enumerate(_as_list(photos)):
        if not isinstance(p, str):
            continue
        m = _DATA_URL.match(p)
        if not m:
            rows.append({"image": p, "idx": i})
            continue
```
Và cuối vòng lặp đổi `urls.append(_file.file_url)` thành `rows.append({"image": _file.file_url, "idx": i})`; đổi `return urls` thành `return rows`.

- [ ] **Step 4: Cập nhật 2 caller report/support theo kiểu trả mới**

Trong `submit_report`, thay:
```python
    urls = _save_photos(doc, photos)
    if urls:
        doc.set("photos", [{"image": u} for u in urls])
        doc.save(ignore_permissions=True)
```
thành:
```python
    rows = _save_photos(doc, photos)
    if rows:
        doc.set("photos", [{"image": r["image"]} for r in rows])
        doc.save(ignore_permissions=True)
```
Làm y hệt cho `submit_support` (cùng đoạn `urls = _save_photos(...)`).

- [ ] **Step 5: Sửa `complete_task` nhận `photo_meta` + ghi child row có cờ**

Thay toàn bộ thân `complete_task` (giữ decorator `@frappe.whitelist()`):
```python
@frappe.whitelist()
def complete_task(task, client_uuid=None, photos=None, photo_meta=None):
    photos = _as_list(photos)
    metas = _as_list(photo_meta)  # [{lat,lng,accuracy,capturedAt,inApp}] khop index voi photos
    doc = frappe.get_doc("Farm Task", task)
    user = frappe.session.user
    if doc.team_leader and doc.team_leader != user \
            and user != "Administrator" and "AKF Admin" not in frappe.get_roles(user):
        frappe.throw("Không có quyền hoàn thành việc này", frappe.PermissionError)
    if doc.require_photo and not photos:
        frappe.throw("Việc này bắt buộc đính kèm ảnh")
    if client_uuid and doc.client_uuid == client_uuid and doc.status == "completed":
        return {"ok": True}  # idempotent
    doc.status = "completed"
    doc.client_uuid = client_uuid
    rows = _save_photos(doc, photos)
    child = []
    for r in rows:
        m = metas[r["idx"]] if r["idx"] < len(metas) else {}
        lat = m.get("lat")
        lng = m.get("lng")
        status, dist = _geo_flag(doc.block, lat, lng)
        cap = m.get("capturedAt")
        child.append({
            "image": r["image"], "lat": lat, "lng": lng,
            "gps_accuracy": m.get("accuracy"),
            "captured_at": frappe.utils.get_datetime(cap) if cap else None,
            "in_app": 1 if m.get("inApp") else 0,
            "gps_status": status, "distance_m": dist,
        })
    doc.set("photos", child)
    doc.save(ignore_permissions=True)
    doc.db_set("completed_on", str(getdate()))
    return {"ok": True}
```

- [ ] **Step 6: Sửa `admin_api.task_photos` trả object giàu hơn**

Trong `admin_api.py`, thay thân `task_photos`:
```python
@frappe.whitelist()
def task_photos(task):
    """Anh hoan thanh cua 1 Farm Task kem metadata GPS/c0 (cho admin xem trong Lich)."""
    rows = frappe.get_all("Farm Task Photo",
        filters={"parent": task, "parenttype": "Farm Task"},
        fields=["image", "lat", "lng", "gps_accuracy", "captured_at",
                "gps_status", "distance_m", "in_app"], order_by="idx asc")
    return [{
        "url": r.image, "lat": r.lat, "lng": r.lng, "gpsAccuracy": r.gps_accuracy,
        "capturedAt": str(r.captured_at) if r.captured_at else None,
        "gpsStatus": r.gps_status or "missing", "distanceM": r.distance_m,
        "inApp": bool(r.in_app),
    } for r in rows if r.image]
```

- [ ] **Step 7: Chạy test — kỳ vọng PASS (chạy full app để bắt hồi quy)**

Run: `docker compose exec -T backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm' 2>&1 | tail -8`
Expected: OK — tất cả test pass (gồm 3 test mới + các test ảnh/permission cũ vẫn xanh).

- [ ] **Step 8: Commit**

```bash
git add backend/akf_farm/akf_farm/api/field_api.py backend/akf_farm/akf_farm/api/admin_api.py backend/akf_farm/akf_farm/api/test_api_field.py
git commit -m "feat: complete_task nhan photo_meta + tinh co GPS; task_photos tra metadata cho admin"
```

---

## Task 3: Frontend — hàm thuần `capture.ts` + `watermark.ts`

**Files:**
- Create: `frontend/src/lib/capture.ts`
- Create: `frontend/src/lib/capture.test.ts`
- Create: `frontend/src/lib/watermark.ts`
- Create: `frontend/src/lib/watermark.test.ts`

**Interfaces:**
- Produces (`capture.ts`):
  - `type CapturedPhoto = { file: File; lat: number|null; lng: number|null; accuracy: number|null; capturedAt: string }`
  - `type PhotoMeta = { lat: number|null; lng: number|null; accuracy: number|null; capturedAt: string; inApp: boolean }`
  - `type GpsStatus = "ok" | "far" | "missing"`
  - `type TaskPhoto = { url: string; lat: number|null; lng: number|null; gpsAccuracy: number|null; capturedAt: string|null; gpsStatus: GpsStatus; distanceM: number|null; inApp: boolean }`
  - `type PhotoFlag = { label: string; tone: "ok" | "warn" | "bad" }`
  - `toPhotoMeta(c: CapturedPhoto): PhotoMeta`
  - `photoFlag(p: TaskPhoto): PhotoFlag`
- Produces (`watermark.ts`):
  - `watermarkLines(capturedAt: Date, lat: number|null, lng: number|null, plotName: string): string[]`
  - `drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, lines: string[]): void`

- [ ] **Step 1: Viết test thất bại `capture.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { toPhotoMeta, photoFlag, type TaskPhoto } from "./capture";

describe("toPhotoMeta", () => {
  it("gan inApp=true, giu nguyen toa do", () => {
    const m = toPhotoMeta({ file: null as any, lat: 11.94, lng: 108.45, accuracy: 8, capturedAt: "2026-06-19T08:00:00Z" });
    expect(m).toEqual({ lat: 11.94, lng: 108.45, accuracy: 8, capturedAt: "2026-06-19T08:00:00Z", inApp: true });
  });
});

describe("photoFlag", () => {
  const base: TaskPhoto = { url: "/x", lat: null, lng: null, gpsAccuracy: null, capturedAt: null, gpsStatus: "ok", distanceM: null, inApp: true };
  it("far -> bad + khoang cach lam tron", () => {
    expect(photoFlag({ ...base, gpsStatus: "far", distanceM: 87.3 })).toEqual({ label: "Ngoài lô (~87m)", tone: "bad" });
  });
  it("missing -> warn", () => {
    expect(photoFlag({ ...base, gpsStatus: "missing" }).tone).toBe("warn");
  });
  it("ok -> ok", () => {
    expect(photoFlag({ ...base, gpsStatus: "ok" }).label).toBe("Trong lô");
  });
});
```

- [ ] **Step 2: Viết test thất bại `watermark.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { watermarkLines } from "./watermark";

describe("watermarkLines", () => {
  it("co GPS -> 3 dong, dong GPS + ten lo dung", () => {
    const lines = watermarkLines(new Date("2026-06-19T08:00:00"), 11.94, 108.458, "Lô A1");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("GPS 11.940000, 108.458000");
    expect(lines[2]).toBe("Lô A1");
  });
  it("thieu GPS -> dong GPS bao thieu", () => {
    const lines = watermarkLines(new Date("2026-06-19T08:00:00"), null, null, "Lô A1");
    expect(lines[1]).toBe("GPS: thiếu");
  });
});
```

- [ ] **Step 3: Chạy test — kỳ vọng FAIL**

Run: `cd frontend && npx vitest run src/lib/capture.test.ts src/lib/watermark.test.ts 2>&1 | tail -12`
Expected: FAIL — không resolve được module `./capture` / `./watermark`.

- [ ] **Step 4: Viết `capture.ts`**

```ts
// Kiểu dữ liệu + hàm thuần cho luồng ảnh nghiệm thu (chống gian lận).
// Tách khỏi component để test được dưới vitest môi trường node.

export type CapturedPhoto = {
  file: File;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  capturedAt: string; // ISO
};

export type PhotoMeta = {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  capturedAt: string;
  inApp: boolean;
};

export type GpsStatus = "ok" | "far" | "missing";

export type TaskPhoto = {
  url: string;
  lat: number | null;
  lng: number | null;
  gpsAccuracy: number | null;
  capturedAt: string | null;
  gpsStatus: GpsStatus;
  distanceM: number | null;
  inApp: boolean;
};

export type PhotoFlag = { label: string; tone: "ok" | "warn" | "bad" };

// Ảnh chụp in-app -> metadata gửi backend (luôn inApp=true).
export function toPhotoMeta(c: CapturedPhoto): PhotoMeta {
  return { lat: c.lat, lng: c.lng, accuracy: c.accuracy, capturedAt: c.capturedAt, inApp: true };
}

// Nhãn + tông màu cho cờ GPS (admin hiển thị).
export function photoFlag(p: TaskPhoto): PhotoFlag {
  if (p.gpsStatus === "far") return { label: `Ngoài lô (~${Math.round(p.distanceM ?? 0)}m)`, tone: "bad" };
  if (p.gpsStatus === "missing") return { label: "Thiếu GPS", tone: "warn" };
  return { label: "Trong lô", tone: "ok" };
}
```

- [ ] **Step 5: Viết `watermark.ts`**

```ts
// Watermark đốt lên ảnh nghiệm thu: giờ + GPS + tên lô.
export function watermarkLines(capturedAt: Date, lat: number | null, lng: number | null, plotName: string): string[] {
  const t = capturedAt.toLocaleString("vi-VN");
  const gps = lat != null && lng != null ? `GPS ${lat.toFixed(6)}, ${lng.toFixed(6)}` : "GPS: thiếu";
  return [t, gps, plotName];
}

// Vẽ overlay (dải đen mờ ở đáy ảnh, chữ trắng) lên canvas đã có ảnh.
export function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, lines: string[]): void {
  const fontPx = Math.max(14, Math.round(h * 0.035));
  const pad = Math.round(fontPx * 0.5);
  const lineH = Math.round(fontPx * 1.3);
  const boxH = lineH * lines.length + pad;
  ctx.font = `bold ${fontPx}px sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, h - boxH, w, boxH);
  ctx.fillStyle = "#ffffff";
  lines.forEach((ln, i) => {
    ctx.fillText(ln, pad, h - boxH + pad + lineH * (i + 1) - Math.round(lineH * 0.3));
  });
}
```

- [ ] **Step 6: Chạy test — kỳ vọng PASS**

Run: `cd frontend && npx vitest run src/lib/capture.test.ts src/lib/watermark.test.ts 2>&1 | tail -10`
Expected: PASS (5 test). Lưu ý: KHÔNG assert `lines[0]` (giờ) vì `toLocaleString` phụ thuộc môi trường.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/capture.ts frontend/src/lib/capture.test.ts frontend/src/lib/watermark.ts frontend/src/lib/watermark.test.ts
git commit -m "feat: ham thuan capture (toPhotoMeta/photoFlag) + watermark cho anh nghiem thu"
```

---

## Task 4: Frontend — component `CameraCapture`

**Files:**
- Create: `frontend/src/components/mobile/CameraCapture.tsx`

**Interfaces:**
- Consumes: `CapturedPhoto` (capture.ts), `watermarkLines`/`drawWatermark` (watermark.ts).
- Produces: `CameraCapture` (React component). Props: `{ plotName: string; onCapture: (p: CapturedPhoto) => void; onClose: () => void; onUnavailable: () => void }`. Mở camera sau, xin GPS song song (không chặn), bấm "Chụp" → vẽ frame + watermark vào canvas → `File` JPEG → `onCapture`. `getUserMedia` thiếu/từ chối → gọi `onUnavailable`.

> Lưu ý: vitest môi trường `node` không có DOM/canvas/media nên component này KHÔNG unit-test được; verify bằng `tsc --noEmit` + `vite build` ở step cuối, và kiểm thử thủ công trên thiết bị (HTTPS).

- [ ] **Step 1: Viết `CameraCapture.tsx`**

```tsx
import React from "react";
import { Camera, X } from "lucide-react";
import { drawWatermark, watermarkLines } from "../../lib/watermark";
import type { CapturedPhoto } from "../../lib/capture";

export function CameraCapture({
  plotName, onCapture, onClose, onUnavailable,
}: {
  plotName: string;
  onCapture: (p: CapturedPhoto) => void;
  onClose: () => void;
  onUnavailable: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const geoRef = React.useRef<{ lat: number | null; lng: number | null; accuracy: number | null }>({
    lat: null, lng: null, accuracy: null,
  });
  const [ready, setReady] = React.useState(false);
  const [shooting, setShooting] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) { onUnavailable(); return; }
    md.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setReady(true);
      })
      .catch(() => { if (alive) onUnavailable(); });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }; },
        () => { /* tu choi/that bai -> giu null */ },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      );
    }
    return () => {
      alive = false;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [onUnavailable]);

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || shooting) return;
    setShooting(true);
    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không tạo được canvas");
      ctx.drawImage(video, 0, 0, w, h);
      const { lat, lng, accuracy } = geoRef.current;
      const capturedAt = new Date();
      drawWatermark(ctx, w, h, watermarkLines(capturedAt, lat, lng, plotName));
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob null"))), "image/jpeg", 0.92),
      );
      const file = new File([blob], `capture-${capturedAt.getTime()}.jpg`, { type: "image/jpeg" });
      onCapture({ file, lat, lng, accuracy, capturedAt: capturedAt.toISOString() });
    } finally {
      setShooting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm truncate">Chụp ảnh tại lô: {plotName}</span>
        <button onClick={onClose} aria-label="Đóng"><X className="w-6 h-6" /></button>
      </div>
      <div className="flex-1 relative">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        {!ready && <p className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">Đang mở camera…</p>}
      </div>
      <div className="p-6 flex justify-center bg-black">
        <button
          onClick={shoot}
          disabled={!ready || shooting}
          aria-label="Chụp"
          className="w-16 h-16 rounded-full bg-white disabled:opacity-50 flex items-center justify-center"
        >
          <Camera className="w-7 h-7 text-black" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck (chỉ file mới, không lỗi)**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "CameraCapture.tsx" || echo "OK: CameraCapture sach"`
Expected: `OK: CameraCapture sach`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/mobile/CameraCapture.tsx
git commit -m "feat: component CameraCapture - camera in-app + GPS + watermark"
```

---

## Task 5: Frontend — ghép camera vào TaskDetail + queries + offline

**Files:**
- Modify: `frontend/src/lib/queries.ts` (`completeTask` thêm `photoMeta`)
- Modify: `frontend/src/lib/offline.ts` (replay `task` truyền `photo_meta`)
- Modify: `frontend/src/components/mobile/TaskDetail.tsx` (thay file picker bằng camera)

**Interfaces:**
- Consumes: `CameraCapture` (Task 4), `CapturedPhoto`/`PhotoMeta`/`toPhotoMeta` (Task 3), `compressImage`/`ONLINE`/`OFFLINE`/`MAX_PHOTOS`/`dataUrlBytes` (`lib/image.ts`), offline helpers.
- Produces: `completeTask(task, clientUuid?, photos?, photoMeta?: PhotoMeta[])`. Offline `task` payload có thêm `photo_meta`.

- [ ] **Step 1: Sửa `queries.ts` — `completeTask` thêm `photoMeta`**

Thêm import ở đầu `queries.ts` (cùng nhóm import lib):
```ts
import type { PhotoMeta, TaskPhoto } from "./capture";
```
Thay dòng `getTaskPhotos` (dòng ~33):
```ts
export const getTaskPhotos = (task: string) => api.get("admin_api.task_photos", { task }) as Promise<TaskPhoto[]>;
```
Thay 2 dòng `completeTask` (dòng ~92-93):
```ts
export const completeTask = (task: string, clientUuid?: string, photos?: string[], photoMeta?: PhotoMeta[]) =>
  api.post("field_api.complete_task", { task, client_uuid: clientUuid, photos, photo_meta: photoMeta });
```

- [ ] **Step 2: Sửa `offline.ts` — replay truyền `photo_meta`**

Trong `replayItem`, nhánh `task`, thay:
```ts
  else if (item.kind === "task") {
    const p = item.payload;
    await completeTask(p.task, p.client_uuid, p.photos);
  }
```
thành:
```ts
  else if (item.kind === "task") {
    const p = item.payload;
    await completeTask(p.task, p.client_uuid, p.photos, p.photo_meta);
  }
```

- [ ] **Step 3: Sửa `TaskDetail.tsx` — import + state camera**

Thay khối import (dòng 3-7) hiện tại:
```tsx
import { ArrowLeft, MapPin, Calendar, Camera, CheckCircle, LifeBuoy, Trash2, Loader2 } from "lucide-react";
import { getTaskDetail, completeTask, getMyPlots } from "../../lib/queries";
import { enqueueOffline, isNetworkError, uid, currentQueueBytes, withinBudget, OFFLINE_BUDGET } from "../../lib/offline";
import { usePhotoPicker } from "../../lib/usePhotoPicker";
import { compressImage, dataUrlBytes, ONLINE, OFFLINE } from "../../lib/image";
```
bằng:
```tsx
import { ArrowLeft, MapPin, Calendar, Camera, CheckCircle, LifeBuoy, Trash2, Loader2 } from "lucide-react";
import { getTaskDetail, completeTask, getMyPlots } from "../../lib/queries";
import { enqueueOffline, isNetworkError, uid, currentQueueBytes, withinBudget, OFFLINE_BUDGET } from "../../lib/offline";
import { compressImage, dataUrlBytes, ONLINE, OFFLINE, MAX_PHOTOS } from "../../lib/image";
import { CameraCapture } from "./CameraCapture";
import { toPhotoMeta, type CapturedPhoto } from "../../lib/capture";
```

Thay dòng state `const picker = usePhotoPicker();` (dòng ~38) bằng:
```tsx
  const [captured, setCaptured] = React.useState<CapturedPhoto[]>([]);
  const [showCamera, setShowCamera] = React.useState(false);
  const [cameraBlocked, setCameraBlocked] = React.useState(false);
  const thumbs = React.useMemo(() => captured.map((c) => URL.createObjectURL(c.file)), [captured]);
  React.useEffect(() => () => thumbs.forEach((u) => URL.revokeObjectURL(u)), [thumbs]);
```

- [ ] **Step 4: Sửa `TaskDetail.tsx` — gate hoàn thành + confirmCompletion**

Thay trong `handleComplete` đoạn kiểm tra ảnh:
```tsx
    if (task.requirePhoto && picker.files.length === 0) {
      alert("Bạn cần chụp ảnh trước khi hoàn thành!");
      return;
    }
```
bằng:
```tsx
    if (task.requirePhoto && captured.length === 0) {
      alert("Việc này bắt buộc chụp ảnh tại chỗ (trong app) trước khi hoàn thành!");
      return;
    }
```

Thay thân `confirmCompletion` — phần dựng `photos` online và offline (giữ nguyên khung try/catch/finally), thay `picker.files` bằng `captured` và thêm `photo_meta`:
```tsx
  const confirmCompletion = async () => {
    if (!id || submitting) return;
    setError(null);
    setSubmitting(true);
    const clientUuid = uid();
    try {
      const photos = await Promise.all(
        captured.map((c) => compressImage(c.file, ONLINE.maxDim, ONLINE.quality)),
      );
      const photoMeta = captured.map(toPhotoMeta);
      await completeTask(id, clientUuid, photos, photoMeta);
      setStatus("completed");
      setShowConfirmation(false);
      navigate("/mobile/success");
    } catch (e: any) {
      if (isNetworkError(e)) {
        const small = await Promise.all(
          captured.map((c) => compressImage(c.file, OFFLINE.maxDim, OFFLINE.quality)),
        );
        const adding = small.reduce((s, d) => s + dataUrlBytes(d), 0);
        if (!withinBudget(currentQueueBytes(), adding, OFFLINE_BUDGET)) {
          setError("Bộ nhớ offline gần đầy. Hãy bớt ảnh hoặc thử lại khi có mạng.");
          return;
        }
        enqueueOffline({
          id: clientUuid, kind: "task",
          payload: { task: id, client_uuid: clientUuid, photos: small, photo_meta: captured.map(toPhotoMeta) },
          title: task.title,
          date: new Date().toISOString(),
        });
        setStatus("completed");
        setShowConfirmation(false);
        navigate("/mobile/success");
      } else {
        setError(e?.message || "Không thể hoàn thành công việc. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };
```

- [ ] **Step 5: Sửa `TaskDetail.tsx` — khối UI chọn/chụp ảnh**

Thay toàn bộ khối "Chọn/Chụp ảnh thật" (từ `<div className="bg-white rounded-lg shadow p-4">` chứa nút "Thêm ảnh", `<input {...picker.inputProps} />`, danh sách `picker.thumbs` — dòng ~225-255) bằng:
```tsx
        {/* Chụp ảnh tại chỗ (camera in-app) — chống gian lận */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">
              Ảnh {task.requirePhoto ? <span className="text-red-600">(bắt buộc, chụp tại chỗ)</span> : "(tùy chọn, chụp tại chỗ)"}
            </p>
            <button
              onClick={() => { setCameraBlocked(false); setShowCamera(true); }}
              disabled={captured.length >= MAX_PHOTOS}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" /> Chụp ảnh
            </button>
          </div>
          {cameraBlocked && (
            <p className="mb-2 text-sm text-red-600">
              Thiết bị không hỗ trợ hoặc chưa cấp quyền camera. Việc bắt buộc ảnh không thể hoàn thành cho tới khi bật camera.
            </p>
          )}
          {captured.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có ảnh. Bấm "Chụp ảnh" để chụp tại lô.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {thumbs.map((src, i) => (
                <div key={src} className="relative">
                  <img src={src} alt="" className="w-full h-24 object-cover rounded-lg" />
                  <button
                    onClick={() => setCaptured((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
```

- [ ] **Step 6: Sửa `TaskDetail.tsx` — render `CameraCapture`**

Ngay trước `{/* Confirmation Modal */}` (dòng ~291), chèn:
```tsx
      {showCamera && (
        <CameraCapture
          plotName={plotNames[task.plotId] || task.plotId}
          onCapture={(p) => {
            setCaptured((prev) => (prev.length >= MAX_PHOTOS ? prev : [...prev, p]));
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
          onUnavailable={() => { setShowCamera(false); setCameraBlocked(true); }}
        />
      )}
```

- [ ] **Step 7: Verify — typecheck sạch 3 file + test cũ vẫn xanh**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "TaskDetail.tsx|queries.ts|offline.ts" || echo "OK: 3 file sach"`
Expected: `OK: 3 file sach` (các lỗi còn lại nếu có chỉ ở `components/ui/*` scaffolding, không liên quan).

Run: `cd frontend && npx vitest run 2>&1 | tail -5`
Expected: tất cả test pass (gồm capture/watermark mới + các test cũ).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/queries.ts frontend/src/lib/offline.ts frontend/src/components/mobile/TaskDetail.tsx
git commit -m "feat: TaskDetail dung camera in-app + gui photo_meta (online/offline)"
```

---

## Task 6: Frontend — admin xem cờ trong modal "Chi tiết"

**Files:**
- Modify: `frontend/src/components/admin/WorkCalendar.tsx` (state `detailPhotos` + render badge)

**Interfaces:**
- Consumes: `getTaskPhotos(): Promise<TaskPhoto[]>` (Task 5), `TaskPhoto`/`photoFlag` (Task 3).

- [ ] **Step 1: Sửa import + kiểu state `detailPhotos`**

Thêm import (cạnh import `getTaskPhotos` từ `../../lib/queries`):
```tsx
import { photoFlag, type TaskPhoto } from "../../lib/capture";
```
Thay dòng `const [detailPhotos, setDetailPhotos] = React.useState<string[]>([]);` (dòng ~122) bằng:
```tsx
  const [detailPhotos, setDetailPhotos] = React.useState<TaskPhoto[]>([]);
```
(`openDetail`/`getTaskPhotos(...).then(setDetailPhotos)` giữ nguyên — kiểu đã khớp.)

- [ ] **Step 2: Sửa render ảnh trong modal "Chi tiết"**

Thay khối grid ảnh hiện tại (dòng ~385-393, nhánh `else` của `detailPhotos.length === 0`):
```tsx
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {detailPhotos.map((src) => (
                      <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                        <img src={src} alt="ảnh việc" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                      </a>
                    ))}
                  </div>
                )}
```
bằng:
```tsx
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {detailPhotos.map((p) => {
                      const flag = photoFlag(p);
                      const tone = flag.tone === "bad"
                        ? "bg-red-100 text-red-700"
                        : flag.tone === "warn"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700";
                      return (
                        <div key={p.url} className="space-y-1">
                          <a href={p.url} target="_blank" rel="noopener noreferrer">
                            <img src={p.url} alt="ảnh việc" className="w-full h-28 object-cover rounded-lg border border-gray-200" />
                          </a>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${tone}`}>{flag.label}</span>
                            {!p.inApp && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Không chụp in-app</span>}
                          </div>
                          {p.lat != null && p.lng != null && (
                            <a className="text-xs text-blue-600 underline" target="_blank" rel="noopener noreferrer"
                               href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}>
                              {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                            </a>
                          )}
                          {p.capturedAt && <div className="text-[11px] text-gray-500">{p.capturedAt}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
```

- [ ] **Step 3: Verify typecheck + build**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "WorkCalendar.tsx" || echo "OK: WorkCalendar sach"`
Expected: `OK: WorkCalendar sach`.

Run: `cd frontend && npx vite build 2>&1 | tail -4`
Expected: build thành công (`✓ built in ...`).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/admin/WorkCalendar.tsx
git commit -m "feat: admin xem co GPS (Ngoai lo / Thieu GPS / Khong chup in-app) trong modal Chi tiet"
```

---

## Task 7: Docs — cập nhật hướng dẫn

**Files:**
- Modify: `docs/web-system-guide.md`
- Modify: `docs/huong-dan-su-dung.md`

- [ ] **Step 1: `web-system-guide.md` — mục mobile Chi Tiết Việc**

Thay 2 dòng (dòng ~175-176):
```markdown
- "Hoàn thành" (bấm trực tiếp, không cần bước "Bắt đầu")
- "Chụp ảnh" (nếu yêu cầu): chụp hoặc chọn ảnh thật từ máy (tối đa 5 ảnh), tự nén chuẩn HD, lưu kèm bản ghi
```
bằng:
```markdown
- "Hoàn thành" (bấm trực tiếp, không cần bước "Bắt đầu")
- "Chụp ảnh" (chống gian lận): mở **camera trong app** chụp trực tiếp tại lô (không chọn ảnh thư viện), tự lấy **GPS + giờ chụp** và đốt **watermark** (giờ · GPS · tên lô) lên ảnh; tối đa 5 ảnh, nén chuẩn HD. Việc bắt buộc ảnh mà thiết bị không cấp quyền/không hỗ trợ camera thì **không hoàn thành được**. Thiếu GPS vẫn cho hoàn thành (gắn cờ cho admin).
```

- [ ] **Step 2: `web-system-guide.md` — mục admin Lịch Công Việc**

Thay dòng (dòng ~110):
```markdown
- Mỗi việc có nút **Cập nhật** mở popup: đổi ngày và/hoặc đổi tổ trưởng rồi bấm **Cập nhật** (gộp chung, lưu một lần)
```
bằng:
```markdown
- Mỗi việc có nút **Cập nhật** mở popup: đổi ngày và/hoặc đổi tổ trưởng rồi bấm **Cập nhật** (gộp chung, lưu một lần)
- Vùng **Việc đã hoàn thành** (dưới lịch) → nút **Chi tiết** xem ảnh nghiệm thu kèm **cờ GPS**: 🟢 Trong lô / 🔴 Ngoài lô (~Xm) / 🟡 Thiếu GPS, và nhãn *Không chụp in-app*; mỗi ảnh có toạ độ (mở Google Maps) + giờ chụp
```

- [ ] **Step 3: `huong-dan-su-dung.md` — mục 5.4 (admin Lịch) + mục 6 (mobile)**

Thay dòng 55:
```markdown
4. **Lịch công việc / Bản đồ nhiệt:** theo dõi tiến độ; bản đồ tô màu theo trạng thái. Admin có thể **dời (lùi) từng việc** trong lịch.
```
bằng:
```markdown
4. **Lịch công việc / Bản đồ nhiệt:** theo dõi tiến độ; bản đồ tô màu theo trạng thái. Admin có thể **dời (lùi) từng việc** trong lịch. Vùng "Việc đã hoàn thành" → **Chi tiết** xem ảnh nghiệm thu kèm **cờ GPS** (Trong lô / Ngoài lô ~Xm / Thiếu GPS) để phát hiện gian lận.
```

Thay dòng 59 (mục 6, mobile):
```markdown
Việc hôm nay → bấm việc → Hoàn thành (đính ảnh thật nếu việc yêu cầu) → Báo cáo cuối ngày (số liệu + bất thường kèm ảnh thật). Ảnh là ảnh thật chụp hoặc tải từ máy (tối đa 5 ảnh/lần), tự nén chuẩn HD, lưu kèm bản ghi. Hoạt động offline: khi mất mạng, ảnh và báo cáo tạm lưu; khi có mạng, tự động đồng bộ (hoặc bấm "Đồng bộ ngay"). Báo cáo bất thường bắt buộc ít nhất 1 ảnh. Xem lịch sử báo cáo, gửi yêu cầu hỗ trợ.
```
bằng:
```markdown
Việc hôm nay → bấm việc → Hoàn thành → Báo cáo cuối ngày (số liệu + bất thường kèm ảnh thật). **Ảnh hoàn thành việc bắt buộc chụp trực tiếp bằng camera trong app** (chống gian lận): tự lấy GPS + giờ chụp + đốt watermark lên ảnh; server tự đối chiếu toạ độ với ranh giới lô và gắn cờ cho admin (ngoài lô / thiếu GPS). Báo cáo & hỗ trợ vẫn chụp/chọn ảnh thường. Ảnh tự nén chuẩn HD, tối đa 5 ảnh/lần. Offline: camera + GPS chạy không cần mạng, ảnh tạm lưu rồi tự đồng bộ khi có mạng (hoặc "Đồng bộ ngay"); báo cáo bất thường bắt buộc ≥1 ảnh.
```

- [ ] **Step 4: Verify nội dung khớp**

Run: `cd /c/Users/SE-HiepNM/akf-farm && grep -n "camera trong app\|cờ GPS\|chống gian lận" docs/web-system-guide.md docs/huong-dan-su-dung.md`
Expected: thấy các dòng vừa thêm ở cả 2 file.

- [ ] **Step 5: Commit**

```bash
git add docs/web-system-guide.md docs/huong-dan-su-dung.md
git commit -m "docs: cap nhat huong dan camera in-app + GPS chong gian lan anh nghiem thu"
```

---

## Self-Review

**1. Spec coverage:**
- Camera in-app bắt buộc, không fallback → Task 4 (component) + Task 5 (gate `require_photo && captured.length===0`, không còn file picker). ✓
- GPS soft, thiếu → `missing` vẫn cho gửi → Task 2 (`_geo_flag` None→missing), Task 5 (GPS không chặn chụp). ✓
- Ngưỡng `far` ngoài polygon + 50m → Task 1 `_GPS_TOLERANCE_M=50`. ✓
- Watermark giờ+GPS+tên lô → Task 3 `watermarkLines`/`drawWatermark`, dùng trong Task 4. ✓
- Cờ tính server từ boundary GeoJSON [lng,lat] → Task 1 `_parse_boundary`/`_geo_flag`. ✓
- Metadata fields trên Farm Task Photo → Task 1. ✓
- `complete_task` nhận photo_meta, ghi child row → Task 2. ✓
- Admin xem cờ → Task 2 (`task_photos`) + Task 6 (badge). ✓
- Offline chụp+GPS, đồng bộ sau, server tính cờ lúc nhận → Task 5 (payload `photo_meta`) + Task 2 (`_geo_flag` chạy lúc complete_task, kể cả replay). ✓
- Test backend dưới quyền tổ trưởng + idempotent (test cũ `test_complete_task_photo_replay_no_duplicate_file` vẫn chạy với code mới) → Task 1/2. ✓
- Docs → Task 7. ✓

**2. Placeholder scan:** Không có TBD/TODO. `drawWatermark` có thân đầy đủ; component camera đầy đủ. Mọi step code đều có mã thật. ✓

**3. Type consistency:**
- `_save_photos` trả `[{"image","idx"}]` — dùng đồng nhất ở `complete_task` (`r["idx"]`, `r["image"]`), `submit_report`/`submit_support` (`r["image"]`). ✓
- `CapturedPhoto`/`PhotoMeta`/`TaskPhoto`/`photoFlag`/`toPhotoMeta` định nghĩa ở `capture.ts` (Task 3), tiêu thụ ở Task 4/5/6 đúng tên + chữ ký. ✓
- `completeTask(task, clientUuid?, photos?, photoMeta?)` — Task 5 định nghĩa, TaskDetail + offline gọi đúng thứ tự tham số. ✓
- `getTaskPhotos(): Promise<TaskPhoto[]>` — Task 5 đổi kiểu, Task 6 tiêu thụ. ✓
- Backend gửi camelCase (`gpsStatus`, `distanceM`, `inApp`, `capturedAt`, `gpsAccuracy`) khớp `TaskPhoto`. ✓
