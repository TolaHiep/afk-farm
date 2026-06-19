# Thiết kế: Chống gian lận ảnh nghiệm thu (camera in-app + GPS + watermark)

Ngày: 2026-06-19
Trạng thái: Chờ user review

## Bối cảnh & vấn đề

Tính năng ảnh hoàn thành việc (vừa làm xong, đã merge `15d6dbb`) cho tổ trưởng **chọn ảnh từ thư viện** (`<input accept="image/*">`), **không** thu GPS, **không** thu giờ chụp, và bước nén bằng canvas **xoá sạch EXIF**. Hệ quả: không có bất kỳ dữ liệu nào để chống gian lận — tổ trưởng có thể gửi ảnh cũ / ảnh chụp ở nơi khác để "nghiệm thu" mà hệ thống không phát hiện.

Mục tiêu: với luồng **Hoàn thành việc**, ép **chụp trực tiếp trong app** + thu **GPS + giờ chụp** + **đốt watermark** lên ảnh, và **gắn cờ cho admin** khi đáng ngờ (lệch lô / thiếu GPS).

## Nguyên tắc & quyết định đã chốt

- **Phạm vi:** CHỈ luồng `complete_task` (mobile `TaskDetail`). Báo cáo (`submit_report`) và hỗ trợ (`submit_support`) **giữ nguyên** chụp/chọn ảnh thường bằng `usePhotoPicker`.
- **Camera in-app — bắt buộc (hard), không fallback chọn file.** Ngữ nghĩa chặn:
  - Việc **không** yêu cầu ảnh (`require_photo = 0`): hoàn thành bình thường, không đổi gì. Ảnh là tuỳ chọn — nếu muốn đính thì phải qua camera in-app.
  - Việc **bắt buộc ảnh** (`require_photo = 1`): chỉ camera in-app mới thêm được ảnh. Nếu thiết bị không hỗ trợ `getUserMedia` hoặc tổ trưởng từ chối quyền camera → không thêm được ảnh → **không hoàn thành được việc đó** (đúng yêu cầu "chặn"). Hiện thông báo rõ lý do.
- **GPS — mềm (soft).** Thiếu GPS / từ chối quyền vị trí: **vẫn cho hoàn thành**, gắn cờ `missing`.
- **Cờ lệch lô:** điểm GPS nằm **ngoài** ranh giới lô **VÀ** khoảng cách tới lô **> 50m** → cờ đỏ `far` (trong 50m coi như dung sai GPS điện thoại). Trong polygon → `ok`.
- **Watermark đốt lên ảnh:** `giờ chụp (client) · GPS lat,lng (hoặc "GPS: thiếu") · tên lô`. Vẽ trên canvas trước khi nén → không tách rời khỏi pixel.
- **Tính cờ ở SERVER** (tin cậy): client gửi lat/lng/accuracy/capturedAt thô; **server** tự tính `gps_status` + `distance_m` từ `boundary` của lô. Client không được tự quyết cờ.
- **Offline:** camera + GPS chạy không cần mạng. Ảnh (đã watermark) + metadata xếp hàng `localStorage` như hiện tại, replay gửi kèm. Server tính cờ lúc nhận.

## Lưu ý thực tế (kỳ vọng đúng)

1. **HTTPS bắt buộc** cho `getUserMedia` ở production (secure context). Dev localhost + tunnel Cloudflare đều HTTPS → OK.
2. Web **không** chống gian lận 100% (vẫn có thể quay/chụp lại màn hình ảnh in). Đây là **răn đe + thu bằng chứng**, không tuyệt đối.
3. Cờ `far`/`missing` là **cảnh báo cho admin tự xử lý**, không tự động từ chối việc.

---

## Backend

### DocType `Farm Task Photo` — thêm field

File: `backend/akf_farm/akf_farm/akf_farm/doctype/farm_task_photo/farm_task_photo.json`

Giữ `image`, thêm (đều optional, default rỗng — báo cáo/hỗ trợ không dùng vẫn hợp lệ):

| fieldname | fieldtype | ghi chú |
|---|---|---|
| `lat` | Float | vĩ độ lúc chụp (client gửi) |
| `lng` | Float | kinh độ lúc chụp |
| `gps_accuracy` | Float | độ chính xác GPS (m) client báo |
| `captured_at` | Datetime | giờ chụp theo máy client |
| `gps_status` | Select | `ok` \| `far` \| `missing` (server tính) |
| `distance_m` | Float | khoảng cách tới lô (server tính; 0 nếu trong lô; null nếu không tính được) |
| `in_app` | Check | 1 = chụp in-app (luồng hoàn thành); 0 = ảnh thường (báo cáo/hỗ trợ) |

`bench migrate` để áp.

### Geo helper (Python) trong `field_api.py`

`boundary` lưu **GeoJSON Polygon** dạng `{"type":"Polygon","coordinates":[[[lng,lat],...]]}` (thứ tự **lng, lat**), khớp `polygonFromGeoJSON` ở frontend.

```python
import math

_GPS_TOLERANCE_M = 50  # ngoai polygon nhung <= 50m van coi la trong lo (dung sai GPS)

def _parse_boundary(block_name):
    """Tra mang [(lat, lng)] tu field boundary GeoJSON Polygon; [] neu khong co/loi."""
    raw = frappe.db.get_value("Farm Block", block_name, "boundary")
    if not raw:
        return []
    try:
        obj = json.loads(raw) if isinstance(raw, str) else raw
        ring = obj["coordinates"][0] if obj.get("type") == "Polygon" else None
        pts = [(float(c[1]), float(c[0])) for c in ring if len(c) >= 2]  # dao [lng,lat]->(lat,lng)
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

def _haversine_m(lat1, lng1, lat2, lng2):
    R = 6371000.0
    p = math.pi / 180
    a = (math.sin((lat2 - lat1) * p / 2) ** 2
         + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lng2 - lng1) * p / 2) ** 2)
    return 2 * R * math.asin(min(1, math.sqrt(a)))

def _distance_to_polygon_m(lat, lng, poly):
    """Khoang cach toi dinh gan nhat cua polygon (xap xi du cho nguong 50m)."""
    return min(_haversine_m(lat, lng, py, px) for (py, px) in poly)

def _geo_flag(block_name, lat, lng):
    """Tra (gps_status, distance_m). Tin cay phia server."""
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

> Ghi chú: dùng khoảng cách tới **đỉnh** gần nhất (không phải tới cạnh) — đủ chính xác cho ngưỡng 50m và đơn giản hơn nhiều. Lô thực tế có nhiều đỉnh nên sai số nhỏ.

### `_save_photos` — trả kèm index gốc

Hiện trả `list[str]` (urls). Vấn đề: hàm **bỏ qua** phần tử lỗi/quá hạn mức → index output lệch index input, không gán đúng metadata. Sửa cho trả **list dict** kèm index gốc:

```python
# thay "urls.append(_file.file_url)" -> "rows.append({"image": _file.file_url, "idx": i})"
# return rows   (rows: list[{"image": str, "idx": int}])
```

Cập nhật 2 caller giữ nguyên hành vi:
- `submit_report` / `submit_support`: `doc.set("photos", [{"image": r["image"]} for r in rows])`.

### `complete_task` — nhận `photo_meta`, tính cờ, ghi child row

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
        lat = m.get("lat"); lng = m.get("lng")
        status, dist = _geo_flag(doc.block, lat, lng)
        child.append({
            "image": r["image"], "lat": lat, "lng": lng,
            "gps_accuracy": m.get("accuracy"), "captured_at": m.get("capturedAt"),
            "in_app": 1 if m.get("inApp") else 0,
            "gps_status": status, "distance_m": dist,
        })
    doc.set("photos", child)
    doc.save(ignore_permissions=True)
    doc.db_set("completed_on", str(getdate()))
    return {"ok": True}
```

### `admin_api.task_photos` — trả object giàu hơn

```python
@frappe.whitelist()
def task_photos(task):
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

---

## Frontend

### `lib/watermark.ts` (mới) — hàm thuần + vẽ canvas

```ts
// Hàm thuần (test được): dựng các dòng watermark.
export function watermarkLines(capturedAt: Date, lat: number | null, lng: number | null, plotName: string): string[] {
  const t = capturedAt.toLocaleString("vi-VN");
  const gps = lat != null && lng != null ? `GPS ${lat.toFixed(6)}, ${lng.toFixed(6)}` : "GPS: thiếu";
  return [t, gps, plotName];
}
// Vẽ overlay (góc dưới-trái, nền đen mờ) lên canvas đã có ảnh. Font ~ 3.5% chiều cao ảnh.
export function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, lines: string[]): void { /* ... */ }
```

### `components/mobile/CameraCapture.tsx` (mới)

Modal toàn màn hình. Props: `{ plotName: string; onCapture: (p: CapturedPhoto) => void; onClose: () => void; onUnavailable: () => void }`.

`CapturedPhoto = { file: File; lat: number | null; lng: number | null; accuracy: number | null; capturedAt: string /* ISO */ }`.

Hành vi:
- `useEffect` mở stream `getUserMedia({ video: { facingMode: "environment" } })`. Lỗi/từ chối → gọi `onUnavailable()` + thông báo (parent xử lý chặn).
- Song song xin GPS `navigator.geolocation.getCurrentPosition` (timeout ~8s) → lưu `{lat,lng,accuracy}` hoặc `null` (không chặn).
- Nút **"Chụp"**: vẽ frame video vào canvas (full-res) → `drawWatermark(...)` với `watermarkLines(new Date(), lat, lng, plotName)` → `canvas.toBlob` → `File` JPEG → `onCapture({file, lat, lng, accuracy, capturedAt})`.
- Dừng stream (`getTracks().forEach(t => t.stop())`) khi đóng/unmount.

### `components/mobile/TaskDetail.tsx` — thay khối ảnh

- Bỏ `usePhotoPicker` (file picker) ở màn này. Thêm state `captured: CapturedPhoto[]` (trần `MAX_PHOTOS`), nút **"Chụp ảnh"** mở `CameraCapture`, thumbnail từ `URL.createObjectURL(p.file)` + nút xoá.
- `CameraCapture.onUnavailable`: set `cameraBlocked = true` → hiện cảnh báo: *"Thiết bị không hỗ trợ hoặc chưa cấp quyền camera. Việc bắt buộc ảnh không thể hoàn thành cho tới khi bật camera."* Đóng modal.
- Gate hoàn thành: `if (task.requirePhoto && captured.length === 0) → chặn` (vì chỉ camera mới thêm được ảnh ⇒ ép in-app).
- `confirmCompletion`:
  - online: nén từng `p.file` ở `ONLINE` → `photos: string[]`; dựng `photo_meta` khớp index `[{lat,lng,accuracy,capturedAt,inApp:true}]`; gọi `completeTask(id, uuid, photos, photoMeta)`.
  - offline (network error): nén ở `OFFLINE`, kiểm `withinBudget`, `enqueueOffline({ kind:"task", payload:{ task, client_uuid, photos, photo_meta } })`.

### `lib/queries.ts`

- `completeTask(task, clientUuid?, photos?, photoMeta?)` → post thêm `photo_meta: JSON.stringify(photoMeta)`.
- `getTaskPhotos` đổi kiểu trả: `Promise<TaskPhoto[]>` với `TaskPhoto = { url; lat; lng; gpsAccuracy; capturedAt; gpsStatus: "ok"|"far"|"missing"; distanceM; inApp }`.

### `lib/offline.ts`

- `OfflineItem.payload` cho `kind:"task"` mang thêm `photo_meta`. `replayItem`: `completeTask(p.task, p.client_uuid, p.photos, p.photo_meta)`. Budget không đổi (meta rất nhỏ).

### `components/admin/WorkCalendar.tsx` — modal "Chi tiết"

- `detailPhotos` đổi sang `TaskPhoto[]`. Mỗi ảnh hiện badge theo `gpsStatus`:
  - `far` → 🔴 `Ngoài lô (~{Math.round(distanceM)}m)`
  - `missing` → 🟡 `Thiếu GPS`
  - `ok` → ✅ `Trong lô`
  - `!inApp` → thêm nhãn xám `Không chụp in-app`
  - kèm toạ độ `lat, lng` (link mở Google Maps tuỳ chọn) + giờ chụp `capturedAt`.

---

## Kiểm thử

### Backend (`test_api_field.py`, chạy dưới quyền tổ trưởng — xem [[frappe-tests-run-as-administrator]])
- `_geo_flag`: (a) điểm trong polygon → `ok`,0; (b) ngoài ≤50m → `ok`; (c) ngoài >50m → `far` + distance>0; (d) lô không boundary → `missing`,None; (e) lat/lng None → `missing`,None. Dùng fixture Farm Block có `boundary` GeoJSON thật.
- `complete_task` với `photo_meta`: child row có đúng `lat/lng/captured_at/in_app=1` + `gps_status` server tính; meta thiếu (ít hơn số ảnh) → ảnh dư `missing`; ảnh không có GPS → `missing`.
- Idempotent: cùng `client_uuid` gọi lại không nhân đôi ảnh/child row.

### Frontend (`vitest`)
- `watermarkLines`: có/không GPS → đúng 3 dòng, format đúng.
- `completeTask` đẩy `photo_meta` lên payload (mock api).
- Camera/`drawWatermark`: smoke tối thiểu (canvas context giả) — không test sâu DOM media.

---

## Phạm vi KHÔNG làm (YAGNI)
- Không ép camera cho báo cáo/hỗ trợ.
- Không tự động từ chối việc khi `far`/`missing` (chỉ cảnh báo admin).
- Không tính khoảng cách tới **cạnh** polygon (dùng đỉnh gần nhất là đủ cho ngưỡng 50m).
- Không lưu trữ chuỗi định vị liên tục / không chống chụp-lại-màn-hình.
