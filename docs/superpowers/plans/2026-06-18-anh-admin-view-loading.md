# Ảnh: loading khi gửi + admin xem ảnh (báo cáo + theo task) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Bổ sung cho feature ảnh thật: (1) trạng thái đang-gửi (spinner + disable nút) khi nén+gửi ảnh ở 3 màn mobile; (2a) admin xem được ảnh của báo cáo chung; (2b) admin xem ảnh hoàn thành của từng task trong popup Lịch công việc.

**Architecture:** Backend bổ sung `photos` cho `list_reports` và endpoint mới `task_photos(task)`. Frontend thêm state submitting + spinner ở mobile, hiển thị ảnh trong popup WorkCalendar và sửa popup TeamLeaderReports hiện tất cả ảnh.

**Tech Stack:** Frappe v15 (Python); React 18 + TS + Vite; vitest; bench run-tests.

## Global Constraints
- File ảnh đã là `/private/files/...` (private, đính kèm bản ghi) — chỉ hiển thị qua `<img src>` same-origin; không đổi cơ chế lưu.
- Không đổi DocType, không migrate.
- Backend test chạy dưới quyền phù hợp; commit ASCII, KHÔNG dấu ngoặc kép.
- Nhánh hiện tại: `feat/anh-that-upload-offline` (làm tiếp, chưa merge).

---

### Task A: Backend — `list_reports` trả photos + endpoint `task_photos`

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/admin_api.py`
- Test: `backend/akf_farm/akf_farm/api/test_api_admin.py`

**Interfaces:**
- Produces: `admin_api.list_reports` mỗi phần tử thêm khoá `photos: list[str]` (các `file_url`). `admin_api.task_photos(task) -> list[str]` (các `file_url` ảnh của 1 Farm Task).

- [ ] **Step 1: Viết test thất bại** — thêm vào `backend/akf_farm/akf_farm/api/test_api_admin.py` (tạo block test mới; đặt trong một TestCase phù hợp đã có hoặc thêm class `TestAdminPhotos(FrappeTestCase)`):

```python
import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import admin_api


class TestAdminPhotos(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z ADP"):
            frappe.get_doc({"doctype": "Farm Zone", "zone_name": "Z ADP", "area": 40000}).insert(ignore_permissions=True)
        if not frappe.db.exists("Farm Block", "B ADP"):
            frappe.get_doc({"doctype": "Farm Block", "block_name": "B ADP", "zone": "Z ADP", "area": 10000}).insert(ignore_permissions=True)

    def test_list_reports_includes_photos(self):
        frappe.db.delete("Team Leader Report", {"client_uuid": "adp1"})
        frappe.get_doc({"doctype": "Team Leader Report", "block": "B ADP", "crop": "Gấc",
                        "report_date": "2026-06-14", "content": "x", "client_uuid": "adp1",
                        "photos": [{"image": "/private/files/r1.jpg"}]}).insert(ignore_permissions=True)
        rows = admin_api.list_reports()
        row = next(r for r in rows if r["content"] == "x" and r["plotId"] == "B ADP")
        self.assertIn("photos", row)
        self.assertIn("/private/files/r1.jpg", row["photos"])

    def test_task_photos_returns_image_urls(self):
        t = frappe.get_doc({"doctype": "Farm Task", "title": "T ADP", "block": "B ADP", "crop": "Gấc",
                            "task_date": "2026-06-14", "status": "completed",
                            "photos": [{"image": "/private/files/t1.jpg"}, {"image": "/private/files/t2.jpg"}]}).insert(ignore_permissions=True)
        urls = admin_api.task_photos(t.name)
        self.assertEqual(urls, ["/private/files/t1.jpg", "/private/files/t2.jpg"])
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `docker compose exec -T backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_api_admin'`
Expected: FAIL — `task_photos` chưa tồn tại / `list_reports` thiếu khoá `photos`.

- [ ] **Step 3: Sửa `list_reports` + thêm `task_photos`** trong `backend/akf_farm/akf_farm/api/admin_api.py`.

Trong `list_reports`, mỗi phần tử trả thêm `photos`. Thay phần `return [...]` của `list_reports` để bổ sung:
```python
    out = []
    for r in rows:
        photos = [p.image for p in frappe.get_all(
            "Farm Task Photo", filters={"parent": r.name, "parenttype": "Team Leader Report"},
            fields=["image"], order_by="idx asc") if p.image]
        out.append({"id": r.name, "teamLeaderId": r.team_leader or "",
                    "reporter": frappe.db.get_value("User", r.team_leader, "full_name") if r.team_leader else "",
                    "plotId": r.block, "crop": r.crop, "date": str(r.report_date) if r.report_date else "",
                    "content": r.content or "", "abnormal": bool(r.abnormal), "status": r.status,
                    "reply": r.reply or "", "photos": photos})
    return out
```

Thêm hàm mới (đặt cạnh `list_reports`):
```python
@frappe.whitelist()
def task_photos(task):
    """Danh sách file_url anh hoan thanh cua 1 Farm Task (cho admin xem trong Lich)."""
    rows = frappe.get_all("Farm Task Photo",
        filters={"parent": task, "parenttype": "Farm Task"},
        fields=["image"], order_by="idx asc")
    return [r.image for r in rows if r.image]
```

- [ ] **Step 4: Chạy lại module test + full suite**

Run: `docker compose exec -T backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_api_admin'` → PASS
Run: `docker compose exec -T backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm'` → toàn bộ PASS

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/admin_api.py backend/akf_farm/akf_farm/api/test_api_admin.py
git commit -m "feat: admin xem anh - list_reports tra photos + endpoint task_photos"
```

---

### Task B: Frontend — trạng thái đang-gửi (spinner + disable) ở 3 màn mobile

**Files:**
- Modify: `frontend/src/components/mobile/TaskDetail.tsx`
- Modify: `frontend/src/components/mobile/MobileSupport.tsx`
- Modify: `frontend/src/components/mobile/DailyReport.tsx`

**Interfaces:** không có export mới (chỉ state nội bộ).

- [ ] **Step 1: TaskDetail — thêm state submitting cho confirmCompletion**

Thêm state cạnh các state khác: `const [submitting, setSubmitting] = React.useState(false);`

Sửa `confirmCompletion` để set submitting và chặn double-run:
```tsx
  const confirmCompletion = async () => {
    if (!id || submitting) return;
    setError(null);
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };
```

- [ ] **Step 2: TaskDetail — spinner + disable trên nút Xác nhận**

Thêm `Loader2` vào import lucide-react. Sửa nút "Xác nhận" trong confirmation modal:
```tsx
              <button
                onClick={confirmCompletion}
                disabled={submitting}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {submitting ? "Đang gửi..." : "Xác nhận"}
              </button>
```
Và nút "Hủy": thêm `disabled={submitting}` (tránh đóng giữa chừng).

- [ ] **Step 3: MobileSupport — thêm state submitting + spinner/disable**

Thêm `const [submitting, setSubmitting] = React.useState(false);` và `Loader2` vào import lucide-react. Trong `handleSubmit`, sau các validate, set submitting:
```tsx
    if (submitting) return;
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
```
Sửa nút "Gửi yêu cầu":
```tsx
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
```

- [ ] **Step 4: DailyReport — thêm spinner vào nút gửi (đã có submitting)**

Thêm `Loader2` vào import lucide-react. Sửa nút submit:
```tsx
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {submitting ? "Đang gửi..." : "Gửi báo cáo lô này"}
          </button>
```

- [ ] **Step 5: Verify**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "TaskDetail.tsx|MobileSupport.tsx|DailyReport.tsx" || echo "OK: 3 man sach"` → expect `OK: 3 man sach`
Run: `cd frontend && npx vite build` → exit 0
Run: `cd frontend && npx vitest run` → all pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/mobile/TaskDetail.tsx frontend/src/components/mobile/MobileSupport.tsx frontend/src/components/mobile/DailyReport.tsx
git commit -m "feat: trang thai dang gui (spinner + disable nut) khi nen+gui anh o 3 man mobile"
```

---

### Task C: Frontend — admin xem ảnh (popup Lịch + popup Báo cáo)

**Files:**
- Modify: `frontend/src/lib/queries.ts`
- Modify: `frontend/src/components/admin/WorkCalendar.tsx`
- Modify: `frontend/src/components/admin/TeamLeaderReports.tsx`

**Interfaces:**
- Consumes: `admin_api.task_photos` (Task A).
- Produces: `getTaskPhotos(task: string): Promise<string[]>` trong queries.ts.

- [ ] **Step 1: queries.ts — thêm getTaskPhotos**

Thêm cạnh các hàm admin khác:
```typescript
export const getTaskPhotos = (task: string) => api.get("admin_api.task_photos", { task }) as Promise<string[]>;
```

- [ ] **Step 2: WorkCalendar — tải + hiển thị ảnh task khi mở popup**

Thêm import `getTaskPhotos` từ `../../lib/queries`. Thêm state:
```tsx
  const [modalPhotos, setModalPhotos] = React.useState<string[]>([]);
```
Sửa `openTaskModal` để tải ảnh:
```tsx
  const openTaskModal = (task: Task) => {
    setModalTask(task);
    setModalDate(task.date);
    setModalLeader(task.teamLeaderId);
    setModalPhotos([]);
    getTaskPhotos(task.id).then(setModalPhotos).catch(() => setModalPhotos([]));
  };
```
Trong nội dung popup (sau phần hiển thị tên việc / lô), thêm khối ảnh:
```tsx
              {/* Ảnh hoàn thành của việc này */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh hoàn thành</label>
                {modalPhotos.length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa có ảnh.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {modalPhotos.map((src) => (
                      <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                        <img src={src} alt="ảnh việc" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
```

- [ ] **Step 3: TeamLeaderReports — popup hiện TẤT CẢ ảnh (không chỉ ảnh đầu)**

Thay khối hiển thị 1 ảnh trong modal:
```tsx
            {(current.photos ?? []).length > 0 && (
              <img src={current.photos[0]} alt="ảnh báo cáo" className="w-full h-48 object-cover rounded-lg border border-gray-200" />
            )}
```
bằng grid tất cả ảnh:
```tsx
            {(current.photos ?? []).length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {current.photos.map((src: string) => (
                  <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                    <img src={src} alt="ảnh báo cáo" className="w-full h-28 object-cover rounded-lg border border-gray-200" />
                  </a>
                ))}
              </div>
            )}
```

- [ ] **Step 4: Verify**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "WorkCalendar.tsx|TeamLeaderReports.tsx|queries.ts" || echo "OK: cac file sach"` → expect `OK: cac file sach`
Run: `cd frontend && npx vite build` → exit 0

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/queries.ts frontend/src/components/admin/WorkCalendar.tsx frontend/src/components/admin/TeamLeaderReports.tsx
git commit -m "feat: admin xem anh - popup Lich hien anh task + popup Bao cao hien tat ca anh"
```

---

## Ghi chú kiểm thử thủ công
- Mobile: hoàn thành việc có ảnh → quan sát nút "Xác nhận" chuyển "Đang gửi..." + spinner + không bấm lại được.
- Admin: Lịch công việc → bấm task đã hoàn thành có ảnh → popup hiện ảnh. Báo cáo tổ trưởng → mở báo cáo có ảnh → hiện tất cả ảnh.
