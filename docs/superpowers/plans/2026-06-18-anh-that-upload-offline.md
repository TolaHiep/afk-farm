# Ảnh thật (upload base64 + offline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho tổ trưởng chụp/chọn ảnh thật khi hoàn thành việc / báo cáo bất thường / yêu cầu hỗ trợ; ảnh nén client-side thành base64, lưu thành File private đính kèm bản ghi ở backend, hoạt động cả khi offline.

**Architecture:** Ảnh đi qua mảng `photos: string[]` sẵn có dưới dạng data URL base64. Frontend nén bằng canvas (online Full HD, offline sàn HD) và quản lý chọn nhiều ảnh qua một hook dùng chung. Backend decode mỗi data URL thành `File` (is_private=1) đính vào bản ghi cha rồi lưu `file_url` vào bảng con `photos`. Offline tái dùng hàng đợi `localStorage` hiện có (base64 nằm trong payload), thêm guardrail dung lượng.

**Tech Stack:** Frappe v15 (Python) backend; React 18 + TypeScript + Vite frontend; vitest; bench run-tests.

## Global Constraints

- Chất lượng ảnh sàn = **HD**: offline/tối thiểu `maxDim=1280, quality=0.8`; online `maxDim=1920, quality=0.85`. JPEG.
- Tối đa **5 ảnh**/lần (`MAX_PHOTOS = 5`).
- File **private**, đính kèm đúng bản ghi (Farm Task / Team Leader Report / Support Request). Tạo `File` doc tường minh với `insert(ignore_permissions=True)` — KHÔNG dùng `save_file(..., ignore_permissions=...)`.
- Không đổi DocType (bảng con `photos` options "Farm Task Photo", field `image` đã có). Không migrate.
- Không đổi nginx (`frontend/nginx.conf` đã có `client_max_body_size 25m` + proxy `/private/`).
- Test backend chạy dưới quyền tổ trưởng (`frappe.set_user(<AKF Team Leader>)`, tearDown về Administrator) — xem `api/test_api_field.py` hiện có.
- Commit message ASCII, KHÔNG dấu ngoặc kép. Co-authored-by Claude + Happy.
- Ngân sách hàng đợi offline `OFFLINE_BUDGET = 4_500_000` bytes.

---

### Task 1: Backend — `_save_photos` + nối vào 3 API

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/field_api.py`
- Test: `backend/akf_farm/akf_farm/api/test_api_field.py`

**Interfaces:**
- Produces: `_save_photos(parent_doc, photos) -> list[str]` — đổi mỗi data URL base64 thành `file_url` của File private đính vào `parent_doc`; phần tử đã là URL (không khớp data URL) giữ nguyên.
- Consumes (sửa hành vi, chữ ký giữ nguyên): `complete_task(task, client_uuid=None, photos=None)`, `submit_report(block, crop, date, content, photos=None, abnormal=0, client_uuid=None)`, `submit_support(block, type, content, photos=None, client_uuid=None)`.

- [ ] **Step 1: Viết test thất bại** — thêm vào cuối class `TestFieldApi` trong `backend/akf_farm/akf_farm/api/test_api_field.py`:

```python
    # 1x1 px PNG hợp lệ, base64
    _PNG_1PX = (
        "data:image/png;base64,"
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )

    def _file_count(self, dt, dn):
        return frappe.db.count("File", {"attached_to_doctype": dt, "attached_to_name": dn})

    def test_complete_task_saves_real_photo(self):
        frappe.set_user(self.leader)
        field_api.complete_task(self.t.name, client_uuid="ph1", photos=[self._PNG_1PX])
        urls = [r.image for r in frappe.get_doc("Farm Task", self.t.name).photos]
        self.assertEqual(len(urls), 1)
        self.assertTrue(urls[0].startswith("/private/files/"))
        self.assertEqual(self._file_count("Farm Task", self.t.name), 1)

    def test_complete_task_photo_replay_no_duplicate_file(self):
        frappe.set_user(self.leader)
        field_api.complete_task(self.t.name, client_uuid="ph2", photos=[self._PNG_1PX])
        # replay cung client_uuid sau khi da completed -> khong tao file thu 2
        field_api.complete_task(self.t.name, client_uuid="ph2", photos=[self._PNG_1PX])
        self.assertEqual(self._file_count("Farm Task", self.t.name), 1)

    def test_existing_url_kept_not_reuploaded(self):
        frappe.set_user(self.leader)
        field_api.complete_task(self.t.name, client_uuid="ph3", photos=["/private/files/already.jpg"])
        urls = [r.image for r in frappe.get_doc("Farm Task", self.t.name).photos]
        self.assertEqual(urls, ["/private/files/already.jpg"])
        self.assertEqual(self._file_count("Farm Task", self.t.name), 0)

    def test_submit_report_saves_real_photo(self):
        frappe.set_user(self.leader)
        frappe.db.delete("Team Leader Report", {"client_uuid": "phR"})
        r = field_api.submit_report(block="B FLD", crop="Gấc", date="2026-06-14",
                                    content="bất thường", photos=[self._PNG_1PX], abnormal=1, client_uuid="phR")
        doc = frappe.get_doc("Team Leader Report", r["name"])
        self.assertEqual(len(doc.photos), 1)
        self.assertTrue(doc.photos[0].image.startswith("/private/files/"))
        self.assertEqual(self._file_count("Team Leader Report", r["name"]), 1)

    def test_submit_support_saves_real_photo(self):
        frappe.set_user(self.leader)
        r = field_api.submit_support(block="B FLD", type="Khác", content="cần giúp", photos=[self._PNG_1PX])
        doc = frappe.get_doc("Support Request", r["name"])
        self.assertEqual(len(doc.photos), 1)
        self.assertTrue(doc.photos[0].image.startswith("/private/files/"))
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `docker compose exec -T backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_api_field'`
Expected: FAIL — `test_complete_task_saves_real_photo` báo `urls[0]` không bắt đầu `/private/files/` (vì hiện lưu nguyên data URL vào `image`).

- [ ] **Step 3: Viết helper + nối vào 3 API** — sửa `backend/akf_farm/akf_farm/api/field_api.py`.

Thêm import + helper ngay dưới phần import hiện có:

```python
import base64
import re

_DATA_URL = re.compile(r"^data:image/(\w+);base64,(.+)$", re.DOTALL)


def _save_photos(parent_doc, photos):
    """Doi moi data URL base64 thanh File private dinh vao parent_doc; giu nguyen URL da co (replay)."""
    urls = []
    for i, p in enumerate(_as_list(photos)):
        if not isinstance(p, str):
            continue
        m = _DATA_URL.match(p)
        if not m:
            urls.append(p)
            continue
        ext = m.group(1)
        content = base64.b64decode(m.group(2))
        ext = "jpg" if ext == "jpeg" else ext
        _file = frappe.get_doc({
            "doctype": "File",
            "file_name": f"{parent_doc.doctype}-{parent_doc.name}-{i}.{ext}",
            "attached_to_doctype": parent_doc.doctype,
            "attached_to_name": parent_doc.name,
            "is_private": 1,
            "content": content,
        }).insert(ignore_permissions=True)
        urls.append(_file.file_url)
    return urls
```

Trong `complete_task`, thay đoạn set photos hiện tại:

```python
    doc.status = "completed"
    doc.client_uuid = client_uuid
    doc.set("photos", [{"image": p} for p in photos])
    doc.save()
    doc.db_set("completed_on", str(getdate()))
    return {"ok": True}
```

thành:

```python
    doc.status = "completed"
    doc.client_uuid = client_uuid
    urls = _save_photos(doc, photos)
    doc.set("photos", [{"image": u} for u in urls])
    doc.save(ignore_permissions=True)
    doc.db_set("completed_on", str(getdate()))
    return {"ok": True}
```

Trong `submit_report`, thay đoạn tạo doc hiện tại:

```python
    doc = frappe.get_doc({
        "doctype": "Team Leader Report", "team_leader": frappe.session.user,
        "block": block, "crop": crop, "report_date": date, "content": content,
        "abnormal": int(abnormal or 0), "client_uuid": client_uuid,
        "photos": [{"image": p} for p in photos],
    }).insert()
    return {"ok": True, "name": doc.name}
```

thành:

```python
    doc = frappe.get_doc({
        "doctype": "Team Leader Report", "team_leader": frappe.session.user,
        "block": block, "crop": crop, "report_date": date, "content": content,
        "abnormal": int(abnormal or 0), "client_uuid": client_uuid,
        "photos": [],
    }).insert(ignore_permissions=True)
    urls = _save_photos(doc, photos)
    if urls:
        doc.set("photos", [{"image": u} for u in urls])
        doc.save(ignore_permissions=True)
    return {"ok": True, "name": doc.name}
```

Trong `submit_support`, thay đoạn tạo doc hiện tại:

```python
    doc = frappe.get_doc({
        "doctype": "Support Request", "team_leader": frappe.session.user, "block": block,
        "type": type, "content": content, "sent_at": frappe.utils.now(), "status": "pending",
        "photos": [{"image": p} for p in photos],
    }).insert()
    return {"ok": True, "name": doc.name}
```

thành:

```python
    doc = frappe.get_doc({
        "doctype": "Support Request", "team_leader": frappe.session.user, "block": block,
        "type": type, "content": content, "sent_at": frappe.utils.now(), "status": "pending",
        "photos": [],
    }).insert(ignore_permissions=True)
    urls = _save_photos(doc, photos)
    if urls:
        doc.set("photos", [{"image": u} for u in urls])
        doc.save(ignore_permissions=True)
    return {"ok": True, "name": doc.name}
```

- [ ] **Step 4: Chạy test để xác nhận PASS (toàn bộ suite)**

Run: `docker compose exec -T backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm'`
Expected: PASS toàn bộ (gồm 5 test mới + các test cũ).

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/field_api.py backend/akf_farm/akf_farm/api/test_api_field.py
git commit -m "feat: backend luu anh that (File private dinh kem) cho complete_task/report/support"
```

---

### Task 2: Frontend — util nén ảnh + guardrail offline

**Files:**
- Create: `frontend/src/lib/image.ts`
- Create: `frontend/src/lib/image.test.ts`
- Modify: `frontend/src/lib/offline.ts`

**Interfaces:**
- Produces (`lib/image.ts`):
  - `scaledSize(w: number, h: number, maxDim: number): { w: number; h: number }` — kích thước sau resize giữ tỉ lệ, không phóng to.
  - `dataUrlBytes(dataUrl: string): number` — số byte thực của phần base64.
  - `compressImage(file: File, maxDim: number, quality: number): Promise<string>` — trả data URL JPEG.
  - `ONLINE = { maxDim: 1920, quality: 0.85 }`, `OFFLINE = { maxDim: 1280, quality: 0.8 }`, `MAX_PHOTOS = 5`.
- Produces (`lib/offline.ts`): `currentQueueBytes(): number`, `OFFLINE_BUDGET = 4_500_000`, `withinBudget(queueBytes: number, addingBytes: number, budget: number): boolean`.

- [ ] **Step 1: Viết test thất bại** — tạo `frontend/src/lib/image.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { scaledSize, dataUrlBytes } from "./image";
import { withinBudget } from "./offline";

describe("scaledSize", () => {
  it("khong phong to anh nho hon maxDim", () => {
    expect(scaledSize(800, 600, 1280)).toEqual({ w: 800, h: 600 });
  });
  it("thu nho theo canh dai, giu ti le (4:3 -> HD)", () => {
    expect(scaledSize(4032, 3024, 1280)).toEqual({ w: 1280, h: 960 });
  });
  it("anh doc cung thu theo canh dai", () => {
    expect(scaledSize(3024, 4032, 1280)).toEqual({ w: 960, h: 1280 });
  });
});

describe("dataUrlBytes", () => {
  it("tinh dung so byte tu phan base64", () => {
    // "AAAA" (4 ky tu base64, khong padding) = 3 byte
    expect(dataUrlBytes("data:image/jpeg;base64,AAAA")).toBe(3);
  });
  it("tru padding '='", () => {
    // "AA==" = 1 byte
    expect(dataUrlBytes("data:image/jpeg;base64,AA==")).toBe(1);
  });
});

describe("withinBudget", () => {
  it("true khi tong <= budget", () => {
    expect(withinBudget(1000, 500, 2000)).toBe(true);
  });
  it("false khi vuot budget", () => {
    expect(withinBudget(1800, 500, 2000)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `cd frontend && npx vitest run src/lib/image.test.ts`
Expected: FAIL — không import được `scaledSize`/`dataUrlBytes`/`withinBudget` (chưa tồn tại).

- [ ] **Step 3: Tạo `frontend/src/lib/image.ts`**

```typescript
// Nén/resize ảnh phía client thành data URL JPEG (canvas). Sàn chất lượng = HD.
export const ONLINE = { maxDim: 1920, quality: 0.85 };
export const OFFLINE = { maxDim: 1280, quality: 0.8 };
export const MAX_PHOTOS = 5;

// Kích thước sau resize: thu theo cạnh dài về maxDim, giữ tỉ lệ; không phóng to.
export function scaledSize(w: number, h: number, maxDim: number): { w: number; h: number } {
  const longest = Math.max(w, h);
  if (longest <= maxDim) return { w, h };
  const k = maxDim / longest;
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

// Số byte thực mã hoá trong data URL base64.
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

// Nén 1 file ảnh -> data URL JPEG. Tôn trọng EXIF orientation.
export async function compressImage(file: File, maxDim: number, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { w, h } = scaledSize(bitmap.width, bitmap.height, maxDim);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không tạo được canvas để nén ảnh");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
```

- [ ] **Step 4: Thêm guardrail vào `frontend/src/lib/offline.ts`**

Sau dòng `const KEY = "akf_offline_queue";` thêm:

```typescript
export const OFFLINE_BUDGET = 4_500_000; // ~4.5MB: tran an toan duoi gioi han localStorage ~5MB
```

Thêm 2 hàm export (đặt cạnh `offlineCount`):

```typescript
export function currentQueueBytes(): number {
  try {
    return (localStorage.getItem(KEY) || "").length;
  } catch {
    return 0;
  }
}

export function withinBudget(queueBytes: number, addingBytes: number, budget: number): boolean {
  return queueBytes + addingBytes <= budget;
}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `cd frontend && npx vitest run`
Expected: PASS toàn bộ (gồm test mới + 14 test cũ).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/image.ts frontend/src/lib/image.test.ts frontend/src/lib/offline.ts
git commit -m "feat: util nen anh (san HD) + guardrail dung luong hang doi offline"
```

---

### Task 3: Frontend — hook chọn nhiều ảnh `usePhotoPicker`

**Files:**
- Create: `frontend/src/lib/usePhotoPicker.tsx`

**Interfaces:**
- Consumes: `MAX_PHOTOS` từ `lib/image`.
- Produces: `usePhotoPicker(): { files: File[]; thumbs: string[]; open: () => void; removeAt: (i: number) => void; clear: () => void; inputProps: object }`. `open()` mở hộp chọn ảnh; `inputProps` spread vào `<input {...picker.inputProps} />` (ẩn); `thumbs` là object URL để hiển thị.

- [ ] **Step 1: Tạo `frontend/src/lib/usePhotoPicker.tsx`**

```tsx
import React from "react";
import { MAX_PHOTOS } from "./image";

// Hook quan ly chon nhieu anh: giu File goc + thumbnail object URL, tran MAX_PHOTOS.
export function usePhotoPicker() {
  const [files, setFiles] = React.useState<File[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const thumbs = React.useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  React.useEffect(() => () => thumbs.forEach((u) => URL.revokeObjectURL(u)), [thumbs]);

  const open = () => inputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // cho phep chon lai cung file
    setFiles((prev) => {
      const next = [...prev, ...picked];
      if (next.length > MAX_PHOTOS) {
        alert(`Chỉ được tối đa ${MAX_PHOTOS} ảnh.`);
      }
      return next.slice(0, MAX_PHOTOS);
    });
  };

  const removeAt = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));
  const clear = () => setFiles([]);

  // Spread vao <input {...inputProps} /> de tranh dinh nghia component long nhau.
  const inputProps = {
    ref: inputRef,
    type: "file" as const,
    accept: "image/*",
    multiple: true,
    hidden: true,
    onChange,
  };

  return { files, thumbs, open, removeAt, clear, inputProps };
}
```

- [ ] **Step 2: Typecheck file mới sạch**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "usePhotoPicker" || echo "OK: khong co loi o usePhotoPicker"`
Expected: `OK: khong co loi o usePhotoPicker`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/usePhotoPicker.tsx
git commit -m "feat: hook usePhotoPicker chon nhieu anh (tran 5, thumbnail)"
```

---

### Task 4: Wire `TaskDetail` — chụp ảnh thật khi hoàn thành việc

**Files:**
- Modify: `frontend/src/components/mobile/TaskDetail.tsx`

**Interfaces:**
- Consumes: `usePhotoPicker` (Task 3); `compressImage, ONLINE, OFFLINE` (Task 2); `currentQueueBytes, withinBudget, OFFLINE_BUDGET, dataUrlBytes` (Task 2 / offline); `completeTask(task, clientUuid?, photos?)` (queries).

- [ ] **Step 1: Sửa imports** — thay dòng import lib hiện có ở đầu `frontend/src/components/mobile/TaskDetail.tsx`:

```tsx
import { getTaskDetail, completeTask, getMyPlots } from "../../lib/queries";
import { enqueueOffline, isNetworkError, uid } from "../../lib/offline";
```

thành:

```tsx
import { getTaskDetail, completeTask, getMyPlots } from "../../lib/queries";
import { enqueueOffline, isNetworkError, uid, currentQueueBytes, withinBudget, OFFLINE_BUDGET } from "../../lib/offline";
import { usePhotoPicker } from "../../lib/usePhotoPicker";
import { compressImage, dataUrlBytes, ONLINE, OFFLINE } from "../../lib/image";
import { Trash2 } from "lucide-react";
```

- [ ] **Step 2: Thay state ảnh giả bằng hook** — bỏ `const [hasPhoto, setHasPhoto] = React.useState(false);`, thêm sau dòng khai báo `showConfirmation`:

```tsx
  const picker = usePhotoPicker();
```

Đổi điều kiện bắt buộc ảnh trong `handleComplete`:

```tsx
  const handleComplete = () => {
    if (!canComplete) return;
    if (task.requirePhoto && picker.files.length === 0) {
      alert("Bạn cần chụp ảnh trước khi hoàn thành!");
      return;
    }
    setShowConfirmation(true);
  };
```

- [ ] **Step 3: Sửa `confirmCompletion` để nén + gửi ảnh thật, offline recompress HD**

```tsx
  const confirmCompletion = async () => {
    if (!id) return;
    setError(null);
    const clientUuid = uid();
    try {
      const photos = await Promise.all(
        picker.files.map((f) => compressImage(f, ONLINE.maxDim, ONLINE.quality))
      );
      await completeTask(id, clientUuid, photos);
      setStatus("completed");
      setShowConfirmation(false);
      navigate("/mobile/success");
    } catch (e: any) {
      if (isNetworkError(e)) {
        const small = await Promise.all(
          picker.files.map((f) => compressImage(f, OFFLINE.maxDim, OFFLINE.quality))
        );
        const adding = small.reduce((s, d) => s + dataUrlBytes(d), 0);
        if (!withinBudget(currentQueueBytes(), adding, OFFLINE_BUDGET)) {
          setError("Bộ nhớ offline gần đầy. Hãy bớt ảnh hoặc thử lại khi có mạng.");
          return;
        }
        enqueueOffline({
          id: clientUuid, kind: "task",
          payload: { task: id, client_uuid: clientUuid, photos: small },
          title: task.title,
          date: new Date().toISOString(),
        });
        setStatus("completed");
        setShowConfirmation(false);
        navigate("/mobile/success");
      } else {
        setError(e?.message || "Không thể hoàn thành công việc. Vui lòng thử lại.");
      }
    }
  };
```

- [ ] **Step 4: Thay khối "Yêu cầu chụp ảnh" giả bằng bộ chọn ảnh thật** — thay toàn bộ block `{task.requirePhoto && ( ... )}` (vùng vàng có nút toggle `setHasPhoto`) bằng:

```tsx
        {/* Chọn/Chụp ảnh thật */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">
              Ảnh {task.requirePhoto ? <span className="text-red-600">(bắt buộc)</span> : "(tùy chọn)"}
            </p>
            <button
              onClick={picker.open}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
            >
              <Camera className="w-4 h-4" /> Thêm ảnh
            </button>
          </div>
          <input {...picker.inputProps} />
          {picker.files.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có ảnh.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {picker.thumbs.map((src, i) => (
                <div key={src} className="relative">
                  <img src={src} alt="" className="w-full h-24 object-cover rounded-lg" />
                  <button
                    onClick={() => picker.removeAt(i)}
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

- [ ] **Step 5: Typecheck — file này không thêm lỗi mới**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "TaskDetail.tsx" || echo "OK: TaskDetail sach"`
Expected: `OK: TaskDetail sach`

- [ ] **Step 6: Build kiểm tra không vỡ**

Run: `cd frontend && npx vite build`
Expected: build thành công (exit 0).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/mobile/TaskDetail.tsx
git commit -m "feat: TaskDetail chup anh that khi hoan thanh viec (online/offline HD)"
```

---

### Task 5: Wire `DailyReport` — ảnh thật cho báo cáo bất thường

**Files:**
- Modify: `frontend/src/components/mobile/DailyReport.tsx`

**Interfaces:**
- Consumes: `usePhotoPicker`, `compressImage, ONLINE, OFFLINE, dataUrlBytes`, `currentQueueBytes, withinBudget, OFFLINE_BUDGET`, `submitReport`.

- [ ] **Step 1: Sửa imports** — thay 2 dòng import lib ở đầu `frontend/src/components/mobile/DailyReport.tsx`:

```tsx
import { submitReport, getMyPlots } from "../../lib/queries";
import { enqueueOffline, isNetworkError, uid } from "../../lib/offline";
```

thành:

```tsx
import { submitReport, getMyPlots } from "../../lib/queries";
import { enqueueOffline, isNetworkError, uid, currentQueueBytes, withinBudget, OFFLINE_BUDGET } from "../../lib/offline";
import { usePhotoPicker } from "../../lib/usePhotoPicker";
import { compressImage, dataUrlBytes, ONLINE, OFFLINE } from "../../lib/image";
import { Trash2 } from "lucide-react";
```

- [ ] **Step 2: Thay state `anomalyPhoto` bằng hook** — bỏ `const [anomalyPhoto, setAnomalyPhoto] = React.useState(false);`, thêm cạnh các state form:

```tsx
  const picker = usePhotoPicker();
```

Trong `resetForm`, bỏ `setAnomalyPhoto(false);` và thêm `picker.clear();`.

- [ ] **Step 3: Sửa kiểm tra bắt buộc ảnh + dựng payload + gửi** — trong `handleSubmit`, thay:

```tsx
    if (hasAnomaly && !anomalyPhoto) {
      alert("Bạn cần chụp ảnh bất thường!");
      return;
    }
```

thành:

```tsx
    if (hasAnomaly && picker.files.length === 0) {
      alert("Bạn cần chụp ảnh bất thường!");
      return;
    }
```

Thay đoạn dựng `photos` (URL Unsplash) và `submitReport` bằng:

```tsx
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const clientUuid = `${activeItem.id}-${uid()}`;

    setSubmitting(true);
    try {
      const photos = hasAnomaly
        ? await Promise.all(picker.files.map((f) => compressImage(f, ONLINE.maxDim, ONLINE.quality)))
        : undefined;
      const payload = {
        block: activeItem.plotId, crop: activeItem.crop, date, content,
        photos, abnormal: hasAnomaly ? 1 : 0, client_uuid: clientUuid,
      };
      await submitReport(payload);
      setReportedIds((prev) => (prev.includes(activeItem.id) ? prev : [...prev, activeItem.id]));
      navigate("/mobile/success");
    } catch (err: any) {
      if (isNetworkError(err)) {
        const small = hasAnomaly
          ? await Promise.all(picker.files.map((f) => compressImage(f, OFFLINE.maxDim, OFFLINE.quality)))
          : undefined;
        const adding = (small ?? []).reduce((s, d) => s + dataUrlBytes(d), 0);
        if (!withinBudget(currentQueueBytes(), adding, OFFLINE_BUDGET)) {
          alert("Bộ nhớ offline gần đầy. Hãy bớt ảnh hoặc thử lại khi có mạng.");
          setSubmitting(false);
          return;
        }
        const payload = {
          block: activeItem.plotId, crop: activeItem.crop, date, content,
          photos: small, abnormal: hasAnomaly ? 1 : 0, client_uuid: clientUuid,
        };
        enqueueOffline({
          id: clientUuid, kind: "report", payload,
          title: `${activeItem.plotName} · ${activeItem.crop}`,
          date: new Date().toISOString(),
        });
        setReportedIds((prev) => (prev.includes(activeItem.id) ? prev : [...prev, activeItem.id]));
        navigate("/mobile/success");
      } else {
        alert(err?.message || "Gửi báo cáo thất bại. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
```

Lưu ý: xoá khối khai báo `content`/`photos`/`payload` cũ ở trên (đoạn dùng Unsplash + `client_uuid: ...-uid()`); giữ phần dựng `content` từ `lines` (đặt trước `setSubmitting(true)`).

- [ ] **Step 4: Thay nút "Chụp ảnh ngay" giả bằng bộ chọn ảnh thật** — trong khối `<div className="bg-red-50 ...">`, thay nút `onClick={() => setAnomalyPhoto(!anomalyPhoto)}` bằng:

```tsx
                  <button
                    type="button"
                    onClick={picker.open}
                    className="w-full py-3 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Camera className="w-5 h-5" /> Thêm ảnh
                    </span>
                  </button>
                  <input {...picker.inputProps} />
                  {picker.files.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {picker.thumbs.map((src, i) => (
                        <div key={src} className="relative">
                          <img src={src} alt="" className="w-full h-20 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => picker.removeAt(i)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
```

- [ ] **Step 5: Typecheck — file này không thêm lỗi mới**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "DailyReport.tsx" || echo "OK: DailyReport sach"`
Expected: `OK: DailyReport sach`

- [ ] **Step 6: Build**

Run: `cd frontend && npx vite build`
Expected: build thành công (exit 0).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/mobile/DailyReport.tsx
git commit -m "feat: DailyReport chup anh that cho bao cao bat thuong (bo URL gia)"
```

---

### Task 6: Wire `MobileSupport` — ảnh thật (tùy chọn) cho yêu cầu hỗ trợ

**Files:**
- Modify: `frontend/src/components/mobile/MobileSupport.tsx`

**Interfaces:**
- Consumes: `usePhotoPicker`, `compressImage, ONLINE, OFFLINE, dataUrlBytes`, `currentQueueBytes, withinBudget, OFFLINE_BUDGET`, `submitSupport`.

- [ ] **Step 1: Sửa imports** — thay dòng import lib ở đầu `frontend/src/components/mobile/MobileSupport.tsx`:

```tsx
import { submitSupport, getMySupport, getMyPlots } from "../../lib/queries";
import { enqueueOffline, isNetworkError, uid } from "../../lib/offline";
```

thành:

```tsx
import { submitSupport, getMySupport, getMyPlots } from "../../lib/queries";
import { enqueueOffline, isNetworkError, uid, currentQueueBytes, withinBudget, OFFLINE_BUDGET } from "../../lib/offline";
import { usePhotoPicker } from "../../lib/usePhotoPicker";
import { compressImage, dataUrlBytes, ONLINE, OFFLINE } from "../../lib/image";
import { Trash2 } from "lucide-react";
```

- [ ] **Step 2: Thay state `hasPhoto` bằng hook** — bỏ `const [hasPhoto, setHasPhoto] = React.useState(false);`, thêm cạnh các state:

```tsx
  const picker = usePhotoPicker();
```

- [ ] **Step 3: Sửa `handleSubmit` — nén + gửi ảnh, offline recompress + guardrail**

Thay từ `const payload = { block: plotId, type, content: content.trim() };` tới hết `catch` bằng:

```tsx
    const base = { block: plotId, type, content: content.trim() };
    try {
      const photos = await Promise.all(picker.files.map((f) => compressImage(f, ONLINE.maxDim, ONLINE.quality)));
      await submitSupport({ ...base, photos });
      setContent("");
      picker.clear();
      alert("Đã gửi yêu cầu hỗ trợ");
      await loadRequests();
    } catch (err) {
      if (isNetworkError(err)) {
        const small = await Promise.all(picker.files.map((f) => compressImage(f, OFFLINE.maxDim, OFFLINE.quality)));
        const adding = small.reduce((s, d) => s + dataUrlBytes(d), 0);
        if (!withinBudget(currentQueueBytes(), adding, OFFLINE_BUDGET)) {
          alert("Bộ nhớ offline gần đầy. Hãy bớt ảnh hoặc thử lại khi có mạng.");
          return;
        }
        enqueueOffline({
          id: uid(), kind: "support", payload: { ...base, photos: small },
          title: `${plotName(plotId)} · ${type}`,
          date: new Date().toISOString(),
        });
        setContent("");
        picker.clear();
        alert("Mất mạng — đã lưu tạm, sẽ tự gửi khi có mạng (xem màn Đồng bộ).");
      } else {
        console.error("Failed to submit support request:", err);
        alert("Gửi yêu cầu thất bại");
      }
    }
```

- [ ] **Step 4: Thay nút "Chụp ảnh" giả bằng bộ chọn ảnh thật** — thay nút `onClick={() => setHasPhoto(!hasPhoto)}` (trong block "Ảnh đính kèm (tùy chọn)") bằng:

```tsx
            <button
              type="button"
              onClick={picker.open}
              className="w-full py-3 rounded-lg font-semibold bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200"
            >
              <span className="flex items-center justify-center gap-2">
                <Camera className="w-5 h-5" /> Thêm ảnh
              </span>
            </button>
            <input {...picker.inputProps} />
            {picker.files.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {picker.thumbs.map((src, i) => (
                  <div key={src} className="relative">
                    <img src={src} alt="" className="w-full h-20 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => picker.removeAt(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
```

- [ ] **Step 5: Typecheck — file này không thêm lỗi mới**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "MobileSupport.tsx" || echo "OK: MobileSupport sach"`
Expected: `OK: MobileSupport sach`

- [ ] **Step 6: Build + chạy lại test frontend**

Run: `cd frontend && npx vite build && npx vitest run`
Expected: build thành công + toàn bộ test PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/mobile/MobileSupport.tsx
git commit -m "feat: MobileSupport chup anh that (tuy chon) cho yeu cau ho tro"
```

---

### Task 7: Cập nhật tài liệu

**Files:**
- Modify: `docs/web-system-guide.md`
- Modify: `docs/huong-dan-su-dung.md`

**Interfaces:** không có (chỉ tài liệu).

- [ ] **Step 1: Cập nhật `docs/web-system-guide.md`** — ở mục Mobile "Chi Tiết Việc" và "Báo Cáo Cuối Ngày", đổi mô tả nút ảnh thành: chụp/chọn nhiều ảnh thật (tối đa 5), ảnh nén chuẩn HD, lưu kèm bản ghi; bất thường bắt buộc ít nhất 1 ảnh.

- [ ] **Step 2: Cập nhật `docs/huong-dan-su-dung.md`** — mục luồng tổ trưởng (mục 6), bổ sung: ảnh là ảnh thật chụp/tải từ máy, hoạt động offline (lưu tạm, tự gửi khi có mạng).

- [ ] **Step 3: Commit**

```bash
git add docs/web-system-guide.md docs/huong-dan-su-dung.md
git commit -m "docs: cap nhat huong dan tinh nang anh that (mobile)"
```

---

## Ghi chú kiểm thử thủ công (sau khi xong, trước khi merge)
- Mở mobile, hoàn thành 1 việc có `require_photo`: thêm 1–2 ảnh thật → Hoàn thành → kiểm tra ảnh hiện ở admin (Chu kỳ/Lịch) và file nằm trong `/private/files`.
- Báo cáo bất thường có ảnh → kiểm tra ở `MobileReportHistory` và admin `TeamLeaderReports`.
- Tắt mạng (DevTools offline), hoàn thành việc có ảnh → vào màn Đồng bộ → bật mạng → đồng bộ → ảnh lên đúng.
