# Chia lô tự động (bisection) + Nhãn cây trên lô — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép chia một vùng thành nhiều lô tự động bằng thuật toán cắt-đôi-đệ-quy (diện tích đều), và gắn nhãn cây (Gấc/Sâm/cả hai) cho lô.

**Architecture:** Thuật toán chia polygon là logic thuần ở frontend (`src/lib/split.ts`), tách bạch và unit-test bằng vitest. Form lô gọi thuật toán để xem trước rồi tạo hàng loạt qua endpoint backend mới `create_plots_bulk`. Nhãn cây lưu thành field `crops` trên DocType `Farm Block`, serialize thành `cropTags` — độc lập với Crop Cycle.

**Tech Stack:** React 18 + TypeScript + Vite + Leaflet (frontend); Frappe v15 / Python (backend); vitest (mới, chỉ để test lib thuần).

## Global Constraints

- Toàn bộ chữ trên giao diện bằng **tiếng Việt**, theo văn phong các component hiện có.
- **Không** thêm thư viện nặng; chỉ thêm `vitest` (devDependency) cho test lib thuần.
- Form dùng **input/select/checkbox thuần** (native) theo đúng style `PlotForm.tsx` hiện tại, không thêm radix mới.
- Sửa DocType `.json` BẮT BUỘC chạy `bench migrate` trước khi test backend.
- Tránh đặt field tên `process` (quy ước dự án — dùng tên khác).
- Nhãn cây chỉ là nhãn hiển thị/lọc; **không** tạo Crop Cycle. Key serialize mới là `cropTags` (KHÔNG đụng key `crops` đang có).
- Test backend chạy trong container: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module <mod>'`.
- Test/biên dịch frontend chạy ở host: `cd frontend; npx vitest run` và `cd frontend; npx tsc --noEmit`.
- Lệnh git commit: dùng message ASCII trong dấu nháy kép, **không** chứa ký tự `"` bên trong (PowerShell sẽ hỏng commit nếu có).
- Đơn vị toạ độ polygon nội bộ là `Pt = { lat: number; lng: number }`. GeoJSON là `[lng, lat]`.

---

## File Structure

**Frontend**
- `frontend/package.json` — thêm devDep `vitest` + script `test`. (Modify)
- `frontend/vitest.config.ts` — cấu hình vitest (môi trường node, gom `src/**/*.test.ts`). (Create)
- `frontend/src/lib/geo.ts` — thêm `Pt` type + `geodesicArea()` (tách dùng chung). (Modify)
- `frontend/src/lib/geo.test.ts` — test `geodesicArea`. (Create)
- `frontend/src/lib/split.ts` — thuật toán chia + helper trọng số/tên. (Create)
- `frontend/src/lib/split.test.ts` — test thuật toán. (Create)
- `frontend/src/lib/queries.ts` — thêm `createPlotsBulk`. (Modify)
- `frontend/src/components/admin/BoundaryMap.tsx` — dùng `geodesicArea` từ geo + prop `splitPreview`. (Modify)
- `frontend/src/components/admin/PlotForm.tsx` — checkbox cây + chế độ chia tự động. (Modify)

**Backend**
- `backend/akf_farm/akf_farm/akf_farm/doctype/farm_block/farm_block.json` — thêm field `crops`. (Modify)
- `backend/akf_farm/akf_farm/api/admin_api.py` — `create_plot`/`update_plot` nhận `crops`; thêm `_norm_crops` + `create_plots_bulk`. (Modify)
- `backend/akf_farm/akf_farm/api/serializers.py` — `serialize_plot` trả `cropTags`. (Modify)
- `backend/akf_farm/akf_farm/api/test_api_split.py` — test crops + bulk. (Create)

---

## Task 1: Frontend test harness + tách `geodesicArea` vào geo.ts

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Modify: `frontend/src/lib/geo.ts`
- Create: `frontend/src/lib/geo.test.ts`
- Modify: `frontend/src/components/admin/BoundaryMap.tsx:7-21` (xoá `geodesicArea` cục bộ, import từ geo)

**Interfaces:**
- Produces:
  - `geo.ts`: `export type Pt = { lat: number; lng: number }` và `export function geodesicArea(pts: Pt[]): number` (m²).

- [ ] **Step 1: Cài vitest**

Run: `cd frontend; npm install -D vitest`
Expected: `vitest` xuất hiện trong `devDependencies`, không lỗi.

- [ ] **Step 2: Thêm script test vào `frontend/package.json`**

Trong khối `"scripts"`, thêm dòng `"test"`:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Tạo `frontend/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Viết test thất bại cho `geodesicArea` — `frontend/src/lib/geo.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { geodesicArea, type Pt } from "./geo";

// Ô vuông ~0.001° cạnh, gần xích đạo: cạnh ~111.32m → diện tích ~12390 m²
const SMALL: Pt[] = [
  { lat: 0, lng: 0 },
  { lat: 0.001, lng: 0 },
  { lat: 0.001, lng: 0.001 },
  { lat: 0, lng: 0.001 },
];

describe("geodesicArea", () => {
  it("trả 0 khi ít hơn 3 điểm", () => {
    expect(geodesicArea([{ lat: 0, lng: 0 }])).toBe(0);
  });
  it("tính diện tích ô vuông nhỏ gần đúng", () => {
    const a = geodesicArea(SMALL);
    expect(a).toBeGreaterThan(12000);
    expect(a).toBeLessThan(12800);
  });
});
```

- [ ] **Step 5: Chạy test để xác nhận FAIL**

Run: `cd frontend; npx vitest run src/lib/geo.test.ts`
Expected: FAIL — `geodesicArea`/`Pt` chưa export từ `geo.ts`.

- [ ] **Step 6: Thêm `Pt` + `geodesicArea` vào đầu `frontend/src/lib/geo.ts`**

Thêm ngay dưới dòng `export type LatLng = [number, number];`:

```ts
export type Pt = { lat: number; lng: number };

// Diện tích đa giác trên mặt cầu Trái Đất (m²) — công thức trắc địa như Leaflet.Draw
export function geodesicArea(pts: Pt[]): number {
  if (pts.length < 3) return 0;
  const R = 6378137; // bán kính Trái Đất (m)
  const d2r = Math.PI / 180;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    area += (p2.lng - p1.lng) * d2r * (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
  }
  return Math.abs((area * R * R) / 2);
}
```

- [ ] **Step 7: Chạy test để xác nhận PASS**

Run: `cd frontend; npx vitest run src/lib/geo.test.ts`
Expected: PASS (2 test).

- [ ] **Step 8: DRY — `BoundaryMap.tsx` dùng `geodesicArea` từ geo**

Trong `frontend/src/components/admin/BoundaryMap.tsx`:
- Sửa import (dòng 5 khu vực import) thêm: `import { geodesicArea } from "../../lib/geo";`
- XOÁ hàm `geodesicArea` cục bộ (dòng ~9-21) và type `Pt` cục bộ nếu trùng — giữ `type Pt = { lat: number; lng: number };` cục bộ vẫn được (structural). Chỉ cần đảm bảo không còn định nghĩa `geodesicArea` cục bộ.

- [ ] **Step 9: Kiểm tra biên dịch frontend**

Run: `cd frontend; npx tsc --noEmit`
Expected: Không lỗi.

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/lib/geo.ts frontend/src/lib/geo.test.ts frontend/src/components/admin/BoundaryMap.tsx
git commit -m "test: them vitest, tach geodesicArea vao geo.ts dung chung"
```

---

## Task 2: `split.ts` — helper trọng số & đặt tên

**Files:**
- Create: `frontend/src/lib/split.ts`
- Create: `frontend/src/lib/split.test.ts`

**Interfaces:**
- Produces (trong `split.ts`):
  - `export function equalWeights(n: number): number[]`
  - `export function plotCountByArea(zoneArea: number, target: number): number`
  - `export function areaRemainder(zoneArea: number, target: number): number`
  - `export function keepSmallWeights(zoneArea: number, target: number): number[]`
  - `export function splitLabels(prefix: string, start: number, count: number): string[]`
  - `export function defaultPrefix(zoneName: string): string`

- [ ] **Step 1: Viết test thất bại — `frontend/src/lib/split.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  equalWeights, plotCountByArea, areaRemainder, keepSmallWeights,
  splitLabels, defaultPrefix,
} from "./split";

describe("helper trọng số & tên", () => {
  it("equalWeights trả n số 1", () => {
    expect(equalWeights(3)).toEqual([1, 1, 1]);
    expect(equalWeights(0)).toEqual([1]); // tối thiểu 1 lô
  });
  it("plotCountByArea làm tròn xuống, tối thiểu 1", () => {
    expect(plotCountByArea(6500, 1000)).toBe(6);
    expect(plotCountByArea(6000, 1000)).toBe(6);
    expect(plotCountByArea(500, 1000)).toBe(1);
  });
  it("areaRemainder = phần dư sau N lô đủ", () => {
    expect(areaRemainder(6500, 1000)).toBe(500);
    expect(areaRemainder(6000, 1000)).toBe(0);
  });
  it("keepSmallWeights nối phần dư khi có dư", () => {
    expect(keepSmallWeights(6500, 1000)).toEqual([1000, 1000, 1000, 1000, 1000, 1000, 500]);
  });
  it("keepSmallWeights không nối khi chia hết", () => {
    expect(keepSmallWeights(6000, 1000)).toEqual([1000, 1000, 1000, 1000, 1000, 1000]);
  });
  it("splitLabels dựng tên theo STT", () => {
    expect(splitLabels("A", 1, 3)).toEqual(["A1", "A2", "A3"]);
    expect(splitLabels("A", 5, 2)).toEqual(["A5", "A6"]);
  });
  it("defaultPrefix bỏ tiền tố 'Vùng'", () => {
    expect(defaultPrefix("Vùng A")).toBe("A");
    expect(defaultPrefix("vùng  B")).toBe("B");
    expect(defaultPrefix("C")).toBe("C");
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd frontend; npx vitest run src/lib/split.test.ts`
Expected: FAIL — module `./split` chưa tồn tại.

- [ ] **Step 3: Tạo `frontend/src/lib/split.ts` (phần helper)**

```ts
import type { Pt } from "./geo";

// Số lô khi chia theo diện tích: làm tròn xuống, tối thiểu 1
export function plotCountByArea(zoneArea: number, target: number): number {
  if (target <= 0) return 1;
  return Math.max(1, Math.floor(zoneArea / target + 1e-9));
}

// Phần diện tích dư sau khi cắt N lô đúng bằng target
export function areaRemainder(zoneArea: number, target: number): number {
  const n = plotCountByArea(zoneArea, target);
  return Math.max(0, zoneArea - n * target);
}

// Trọng số bằng nhau cho n lô (tối thiểu 1)
export function equalWeights(n: number): number[] {
  return Array(Math.max(1, Math.floor(n))).fill(1);
}

// Trọng số "giữ lô nhỏ": N lô đúng target + 1 lô phần dư (nếu dư > 1 m²)
export function keepSmallWeights(zoneArea: number, target: number): number[] {
  const n = plotCountByArea(zoneArea, target);
  const rem = zoneArea - n * target;
  const w = Array(n).fill(target);
  if (rem > 1) w.push(rem);
  return w;
}

// Tên lô: prefix + STT liên tiếp
export function splitLabels(prefix: string, start: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${start + i}`);
}

// Tiền tố mặc định suy từ tên vùng: "Vùng A" -> "A"
export function defaultPrefix(zoneName: string): string {
  const stripped = (zoneName || "").replace(/^\s*vùng\s+/i, "").replace(/\s+/g, " ").trim();
  return stripped || (zoneName || "").trim();
}

// (splitPolygonByWeights được thêm ở Task 3)
export type { Pt };
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd frontend; npx vitest run src/lib/split.test.ts`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/split.ts frontend/src/lib/split.test.ts
git commit -m "feat: split.ts helper trong so va dat ten lo"
```

---

## Task 3: `split.ts` — thuật toán `splitPolygonByWeights`

**Files:**
- Modify: `frontend/src/lib/split.ts`
- Modify: `frontend/src/lib/split.test.ts` (thêm describe mới)

**Interfaces:**
- Consumes: `geodesicArea`, `Pt` từ `./geo`.
- Produces: `export function splitPolygonByWeights(polygon: Pt[], weights: number[]): Pt[][]`
  — cắt `polygon` thành `weights.length` mảnh, diện tích mỗi mảnh tỉ lệ với `weights`.

- [ ] **Step 1: Viết test thất bại — thêm vào `frontend/src/lib/split.test.ts`**

Thêm import ở đầu file:

```ts
import { splitPolygonByWeights } from "./split";
import { geodesicArea, type Pt } from "./geo";
```

Thêm khối test:

```ts
const SQUARE: Pt[] = [
  { lat: 0, lng: 0 },
  { lat: 0.02, lng: 0 },
  { lat: 0.02, lng: 0.02 },
  { lat: 0, lng: 0.02 },
];

const areasOf = (parts: Pt[][]) => parts.map((p) => geodesicArea(p));

describe("splitPolygonByWeights", () => {
  it("chia đúng số mảnh, mỗi mảnh >= 3 điểm", () => {
    const parts = splitPolygonByWeights(SQUARE, [1, 1, 1, 1]);
    expect(parts.length).toBe(4);
    parts.forEach((p) => expect(p.length).toBeGreaterThanOrEqual(3));
  });
  it("bảo toàn tổng diện tích", () => {
    const total = geodesicArea(SQUARE);
    const parts = splitPolygonByWeights(SQUARE, [1, 1, 1, 1, 1, 1]);
    const sum = areasOf(parts).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - total) / total).toBeLessThan(0.01);
  });
  it("trọng số bằng nhau -> diện tích bằng nhau", () => {
    const a = areasOf(splitPolygonByWeights(SQUARE, [1, 1, 1, 1]));
    const min = Math.min(...a), max = Math.max(...a);
    expect((max - min) / max).toBeLessThan(0.02);
  });
  it("giữ đúng tỉ lệ trọng số 3:1", () => {
    const a = areasOf(splitPolygonByWeights(SQUARE, [3, 1])).sort((x, y) => x - y);
    expect(a[1] / a[0]).toBeGreaterThan(2.7);
    expect(a[1] / a[0]).toBeLessThan(3.3);
  });
  it("weights 1 phần tử trả nguyên polygon", () => {
    const parts = splitPolygonByWeights(SQUARE, [1]);
    expect(parts.length).toBe(1);
    expect(parts[0].length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd frontend; npx vitest run src/lib/split.test.ts`
Expected: FAIL — `splitPolygonByWeights` chưa export.

- [ ] **Step 3: Cài thuật toán vào `frontend/src/lib/split.ts`**

Thay dòng comment `// (splitPolygonByWeights được thêm ở Task 3)` bằng:

```ts
type XY = { x: number; y: number };

function planArea(poly: XY[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

// Cắt polygon bằng nửa mặt phẳng (Sutherland–Hodgman cho 1 đường thẳng đứng/ngang)
function clip(poly: XY[], axis: "x" | "y", cut: number, keepLower: boolean): XY[] {
  const coord = (p: XY) => (axis === "x" ? p.x : p.y);
  const inside = (p: XY) => (keepLower ? coord(p) <= cut : coord(p) >= cut);
  const out: XY[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ain = inside(a), bin = inside(b);
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (cut - coord(a)) / (coord(b) - coord(a));
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return out;
}

function recurse(poly: XY[], weights: number[]): XY[][] {
  if (weights.length <= 1) return [poly];
  const half = Math.ceil(weights.length / 2);
  const wFirst = weights.slice(0, half);
  const wRest = weights.slice(half);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const frac = sum(wFirst) / sum(weights);

  // chọn cạnh dài hơn của bounding box để cắt -> lô gọn hơn
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of poly) {
    if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
    if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y;
  }
  const axis: "x" | "y" = (maxx - minx) >= (maxy - miny) ? "x" : "y";
  const lo = axis === "x" ? minx : miny;
  const hi = axis === "x" ? maxx : maxy;

  const target = planArea(poly) * frac;
  let a = lo, c = hi;
  for (let i = 0; i < 40; i++) {
    const mid = (a + c) / 2;
    if (planArea(clip(poly, axis, mid, true)) < target) a = mid;
    else c = mid;
  }
  const cut = (a + c) / 2;
  const left = clip(poly, axis, cut, true);
  const right = clip(poly, axis, cut, false);
  return [...recurse(left, wFirst), ...recurse(right, wRest)];
}

// Cắt polygon thành weights.length mảnh, diện tích tỉ lệ với weights.
export function splitPolygonByWeights(polygon: Pt[], weights: number[]): Pt[][] {
  if (weights.length <= 1) return [polygon];
  const lat0 = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  const k = Math.cos((lat0 * Math.PI) / 180) || 1; // chiếu equirectangular giữ tỉ lệ diện tích
  const proj: XY[] = polygon.map((p) => ({ x: p.lng * k, y: p.lat }));
  const parts = recurse(proj, weights);
  return parts.map((part) => part.map((q) => ({ lat: q.y, lng: q.x / k })));
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd frontend; npx vitest run src/lib/split.test.ts`
Expected: PASS (toàn bộ test, gồm 5 test mới).

- [ ] **Step 5: Kiểm tra biên dịch**

Run: `cd frontend; npx tsc --noEmit`
Expected: Không lỗi.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/split.ts frontend/src/lib/split.test.ts
git commit -m "feat: thuat toan splitPolygonByWeights cat-doi de quy"
```

---

## Task 4: Backend — field `crops` + `create_plot/update_plot` + `cropTags`

**Files:**
- Modify: `backend/akf_farm/akf_farm/akf_farm/doctype/farm_block/farm_block.json`
- Modify: `backend/akf_farm/akf_farm/api/admin_api.py:52-67` (create_plot/update_plot) + thêm `_norm_crops`
- Modify: `backend/akf_farm/akf_farm/api/serializers.py:25-40` (serialize_plot)
- Create: `backend/akf_farm/akf_farm/api/test_api_split.py`

**Interfaces:**
- Produces:
  - `admin_api._norm_crops(crops) -> str | None` (list/JSON/chuỗi -> "Gấc,Sâm")
  - `create_plot(..., crops=None)` và `update_plot` xử lý `crops`.
  - `serialize_plot(...)` trả thêm `"cropTags": list[str]`.

- [ ] **Step 1: Viết test thất bại — `backend/akf_farm/akf_farm/api/test_api_split.py`**

```python
import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import admin_api

SQUARE = '{"type":"Polygon","coordinates":[[[0,0],[0,0.01],[0.01,0.01],[0.01,0],[0,0]]]}'


class TestPlotCrops(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z SPLIT"):
            admin_api.create_zone(zone_name="Z SPLIT", area=100000, boundary=SQUARE)

    def test_create_plot_with_crops_list(self):
        p = admin_api.create_plot(block_name="BC1", zone="Z SPLIT", area=1000, crops=["Gấc", "Sâm"])
        self.assertEqual(p["cropTags"], ["Gấc", "Sâm"])
        self.assertEqual(frappe.db.get_value("Farm Block", "BC1", "crops"), "Gấc,Sâm")

    def test_update_plot_crops(self):
        admin_api.create_plot(block_name="BC2", zone="Z SPLIT", area=1000)
        admin_api.update_plot("BC2", crops="Gấc")
        self.assertEqual(admin_api.get_plot("BC2")["cropTags"], ["Gấc"])

    def test_no_crops_returns_empty_tags(self):
        admin_api.create_plot(block_name="BC3", zone="Z SPLIT", area=1000)
        self.assertEqual(admin_api.get_plot("BC3")["cropTags"], [])
```

- [ ] **Step 2: Thêm field `crops` vào `farm_block.json`**

Trong `field_order`, thêm `"crops"` sau `"team_leader"`:

```json
 "field_order": [
  "block_name",
  "zone",
  "area",
  "boundary",
  "team_leader",
  "crops",
  "status"
 ],
```

Trong mảng `fields`, thêm (sau object `team_leader`, trước `status`):

```json
  {
   "fieldname": "crops",
   "fieldtype": "Small Text",
   "label": "Cây trồng (nhãn)"
  },
```

- [ ] **Step 3: Migrate để áp field mới**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost migrate'`
Expected: Migrate xong, không lỗi; cột `crops` được thêm vào `Farm Block`.

- [ ] **Step 4: Thêm `_norm_crops` + sửa `create_plot`/`update_plot` trong `admin_api.py`**

Ngay trên `def create_plot` (sau khối CRUD vùng), thêm helper:

```python
def _norm_crops(crops):
    """Chuẩn hoá crops (list / JSON / chuỗi) -> 'Gấc,Sâm' hoặc None."""
    if not crops:
        return None
    if isinstance(crops, str):
        try:
            parsed = frappe.parse_json(crops)
        except Exception:
            parsed = None
        if isinstance(parsed, list):
            crops = parsed
        else:
            return crops.strip() or None
    if isinstance(crops, (list, tuple)):
        items = [str(c).strip() for c in crops if str(c).strip()]
        return ",".join(items) or None
    return str(crops).strip() or None
```

Sửa `create_plot` thêm tham số `crops`:

```python
@frappe.whitelist()
def create_plot(block_name, zone, area, team_leader=None, boundary=None, status="good", crops=None):
    doc = frappe.get_doc({"doctype": "Farm Block", "block_name": block_name, "zone": zone,
                          "area": area, "team_leader": team_leader, "boundary": boundary,
                          "status": status, "crops": _norm_crops(crops)}).insert()
    return serialize_plot(doc.name)
```

Sửa `update_plot` để xử lý `crops`:

```python
@frappe.whitelist()
def update_plot(name, **kwargs):
    doc = frappe.get_doc("Farm Block", name)
    for f in ("block_name", "zone", "area", "team_leader", "boundary", "status"):
        if f in kwargs:
            doc.set(f, kwargs[f])
    if "crops" in kwargs:
        doc.set("crops", _norm_crops(kwargs["crops"]))
    doc.save()
    return serialize_plot(doc.name)
```

- [ ] **Step 5: Thêm `cropTags` vào `serialize_plot` trong `serializers.py`**

Thêm helper trên `def serialize_plot`:

```python
def _crop_tags(raw):
    if not raw:
        return []
    return [c.strip() for c in str(raw).split(",") if c.strip()]
```

Trong dict trả về của `serialize_plot`, thêm key `cropTags` (vd ngay sau `"crop": ...`):

```python
        "crops": crop_objs, "crop": " + ".join(crops),
        "cropTags": _crop_tags(b.crops),
```

- [ ] **Step 6: Chạy test backend để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_api_split'`
Expected: PASS (3 test).

- [ ] **Step 7: Commit**

```bash
git add backend/akf_farm/akf_farm/akf_farm/doctype/farm_block/farm_block.json backend/akf_farm/akf_farm/api/admin_api.py backend/akf_farm/akf_farm/api/serializers.py backend/akf_farm/akf_farm/api/test_api_split.py
git commit -m "feat: nhan cay tren lo (field crops -> cropTags)"
```

---

## Task 5: Backend — `create_plots_bulk`

**Files:**
- Modify: `backend/akf_farm/akf_farm/api/admin_api.py` (thêm endpoint sau `delete_plot`)
- Modify: `backend/akf_farm/akf_farm/api/test_api_split.py` (thêm test)

**Interfaces:**
- Consumes: `_norm_crops`, `serialize_plot`.
- Produces: `create_plots_bulk(zone, plots, team_leader=None) -> list[dict]`
  — `plots` là list (hoặc chuỗi JSON) các `{block_name, area, boundary, crops?}`; trả danh sách lô đã tạo.

- [ ] **Step 1: Viết test thất bại — thêm vào `test_api_split.py`**

```python
class TestPlotsBulk(FrappeTestCase):
    def setUp(self):
        if not frappe.db.exists("Farm Zone", "Z BULK"):
            admin_api.create_zone(zone_name="Z BULK", area=100000, boundary=SQUARE)

    def test_create_plots_bulk(self):
        plots = [
            {"block_name": "BK1", "area": 500, "boundary": SQUARE, "crops": ["Gấc"]},
            {"block_name": "BK2", "area": 500, "boundary": SQUARE, "crops": ["Gấc", "Sâm"]},
        ]
        out = admin_api.create_plots_bulk(zone="Z BULK", plots=plots)
        self.assertEqual(len(out), 2)
        self.assertEqual(out[1]["cropTags"], ["Gấc", "Sâm"])
        self.assertTrue(frappe.db.exists("Farm Block", "BK1"))
        self.assertEqual(frappe.db.get_value("Farm Block", "BK1", "zone"), "Z BULK")

    def test_bulk_applies_team_leader_to_all(self):
        plots = [{"block_name": "BKT1", "area": 500, "boundary": SQUARE}]
        out = admin_api.create_plots_bulk(zone="Z BULK", plots=plots, team_leader="Administrator")
        self.assertEqual(out[0]["teamLeaderId"], "Administrator")

    def test_bulk_duplicate_name_raises(self):
        admin_api.create_plot(block_name="DUP", zone="Z BULK", area=100)
        with self.assertRaises(frappe.exceptions.DuplicateEntryError):
            admin_api.create_plots_bulk(zone="Z BULK", plots=[{"block_name": "DUP", "area": 1, "boundary": SQUARE}])
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_api_split'`
Expected: FAIL — `create_plots_bulk` chưa tồn tại.

- [ ] **Step 3: Thêm `create_plots_bulk` vào `admin_api.py` (ngay sau `delete_plot`)**

```python
@frappe.whitelist()
def create_plots_bulk(zone, plots, team_leader=None):
    """Tạo nhiều lô trong 1 request (dùng cho chia lô tự động)."""
    if isinstance(plots, str):
        plots = frappe.parse_json(plots)
    out = []
    for p in plots:
        doc = frappe.get_doc({
            "doctype": "Farm Block",
            "block_name": p.get("block_name"),
            "zone": zone,
            "area": p.get("area"),
            "boundary": p.get("boundary"),
            "team_leader": team_leader or p.get("team_leader"),
            "crops": _norm_crops(p.get("crops")),
            "status": p.get("status") or "good",
        }).insert()
        out.append(serialize_plot(doc.name))
    return out
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `docker compose exec backend bash -lc 'bench --site akf.localhost run-tests --app akf_farm --module akf_farm.api.test_api_split'`
Expected: PASS (toàn bộ, gồm 3 test bulk mới).

Lưu ý: nếu `DuplicateEntryError` không khớp, đổi assertion sang `frappe.exceptions.ValidationError` (tuỳ phiên bản) — chạy lại tới khi xanh.

- [ ] **Step 5: Commit**

```bash
git add backend/akf_farm/akf_farm/api/admin_api.py backend/akf_farm/akf_farm/api/test_api_split.py
git commit -m "feat: endpoint create_plots_bulk tao nhieu lo mot lan"
```

---

## Task 6: `BoundaryMap` — prop `splitPreview` (xem trước chỉ đọc)

**Files:**
- Modify: `frontend/src/components/admin/BoundaryMap.tsx`

**Interfaces:**
- Consumes: `Pt` (cục bộ trong file).
- Produces: `BoundaryMap` nhận thêm prop tuỳ chọn
  `splitPreview?: { label: string; polygon: Pt[] }[]`.
  Khi có `splitPreview`: vẽ các polygon kèm nhãn ở chế độ chỉ đọc (không thêm điểm khi click),
  canh khung nhìn ôm trọn; ẩn lớp vẽ tay.

- [ ] **Step 1: Thêm prop vào chữ ký component**

Trong định nghĩa props của `BoundaryMap` (khoảng dòng 37-47), thêm:

```ts
  splitPreview,
}: {
  onChange?: (area: number, points: Pt[]) => void;
  initial?: Pt[];
  constraint?: Pt[];
  splitPreview?: { label: string; polygon: Pt[] }[];
}) {
```

- [ ] **Step 2: Thêm layer + ref cho preview**

Sau dòng `const constraintLayerRef = React.useRef<L.LayerGroup | null>(null);`, thêm:

```ts
  const previewLayerRef = React.useRef<L.LayerGroup | null>(null);
```

Trong effect khởi tạo map (sau `layerRef.current = L.layerGroup().addTo(map);`), thêm:

```ts
    previewLayerRef.current = L.layerGroup().addTo(map);
```

- [ ] **Step 3: Chặn click thêm điểm khi đang preview**

Trong handler `map.on("click", ...)`, thêm ngay đầu hàm:

```ts
      if (splitPreviewRef.current && splitPreviewRef.current.length) return; // chế độ xem trước: chỉ đọc
```

Và thêm ref đồng bộ (cạnh `constraintRef`):

```ts
  const splitPreviewRef = React.useRef(splitPreview);
  React.useEffect(() => { splitPreviewRef.current = splitPreview; }, [splitPreview]);
```

- [ ] **Step 4: Vẽ preview trong một effect mới (sau effect vẽ điểm)**

```ts
  // Vẽ xem trước chia lô (chỉ đọc) + canh khung nhìn
  React.useEffect(() => {
    const map = mapRef.current, layer = previewLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!splitPreview || !splitPreview.length) return;
    const all: [number, number][] = [];
    splitPreview.forEach((item, i) => {
      const latlngs = item.polygon.map((p) => [p.lat, p.lng] as [number, number]);
      all.push(...latlngs);
      L.polygon(latlngs, {
        color: "#2563eb", weight: 2,
        fillColor: i % 2 ? "#3b82f6" : "#60a5fa", fillOpacity: 0.25,
      }).addTo(layer);
      const c = latlngs.reduce((acc, [la, ln]) => [acc[0] + la, acc[1] + ln], [0, 0]);
      const center: [number, number] = [c[0] / latlngs.length, c[1] / latlngs.length];
      L.marker(center, {
        interactive: false,
        icon: L.divIcon({ className: "akf-plot-label", html: `<span>${item.label}</span>` }),
      }).addTo(layer);
    });
    if (all.length) map.fitBounds(L.latLngBounds(all), { padding: [20, 20], maxZoom: 18 });
  }, [splitPreview]);
```

- [ ] **Step 5: Ẩn lớp vẽ tay khi đang preview**

Trong effect vẽ điểm (bắt đầu `const layer = layerRef.current;`), thêm sau `layer.clearLayers();`:

```ts
    if (splitPreview && splitPreview.length) { onChange?.(0, []); return; } // đang xem trước: không vẽ tay
```

- [ ] **Step 6: Kiểm tra biên dịch**

Run: `cd frontend; npx tsc --noEmit`
Expected: Không lỗi.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/admin/BoundaryMap.tsx
git commit -m "feat: BoundaryMap ho tro xem truoc chia lo (splitPreview)"
```

---

## Task 7: `PlotForm` — checkbox cây (Phần A)

**Files:**
- Modify: `frontend/src/components/admin/PlotForm.tsx`

**Interfaces:**
- Consumes: `createPlot`/`updatePlot`/`getPlot` (đã có); `getPlot` trả `cropTags` (Task 4).
- Produces: form lô gửi `crops: string[]` khi tạo/sửa; hiển thị 2 checkbox Gấc/Sâm.

- [ ] **Step 1: Thêm state `cropTags`**

Sau `const [points, setPoints] = React.useState<Pt[]>([]);` thêm:

```ts
  const [cropTags, setCropTags] = React.useState<string[]>([]);
```

- [ ] **Step 2: Nạp `cropTags` khi sửa lô**

Trong nhánh `if (isEdit && id)` (sau `setArea(p.area || 0);`), thêm:

```ts
          setCropTags(Array.isArray(p.cropTags) ? p.cropTags : []);
```

- [ ] **Step 3: Gửi `crops` khi submit**

Trong `handleSubmit`, sửa 2 lời gọi:

```ts
      if (isEdit && id) {
        await updatePlot(id, { block_name: name, zone: zoneId, area, team_leader: teamLeader || undefined, boundary, crops: cropTags });
      } else if (isZone) {
        await createZone({ zone_name: name, area, boundary });
      } else {
        await createPlot({ block_name: name, zone: zoneId, area, team_leader: teamLeader || undefined, boundary, crops: cropTags });
      }
```

- [ ] **Step 4: Thay dropdown "Loại cây" chết bằng 2 checkbox**

Thay nguyên khối `<div>...Loại cây...<select>...</select></div>` (khoảng dòng 214-223) bằng:

```tsx
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cây trồng
                  </label>
                  <div className="flex gap-4">
                    {["Gấc", "Sâm"].map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={cropTags.includes(c)}
                          onChange={(e) =>
                            setCropTags((prev) =>
                              e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)
                            )
                          }
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
```

- [ ] **Step 5: Kiểm tra biên dịch**

Run: `cd frontend; npx tsc --noEmit`
Expected: Không lỗi.

- [ ] **Step 6: Kiểm tra tay trên dev (compose đang chạy)**

- Mở `http://localhost:8080` → Quản lý vùng/lô → Thêm lô → tích cả **Gấc** và **Sâm** → Lưu.
- Sửa lại lô đó → 2 checkbox vẫn được tích đúng.
- Expected: lưu thành công, nhãn cây giữ đúng khi sửa.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/admin/PlotForm.tsx
git commit -m "feat: form lo chon nhan cay Gac/Sam bang checkbox"
```

---

## Task 8: `PlotForm` — chế độ chia tự động (Phần B) + `createPlotsBulk`

**Files:**
- Modify: `frontend/src/lib/queries.ts` (thêm `createPlotsBulk`)
- Modify: `frontend/src/components/admin/PlotForm.tsx`

**Interfaces:**
- Consumes: `splitPolygonByWeights`, `equalWeights`, `keepSmallWeights`, `plotCountByArea`, `areaRemainder`, `splitLabels`, `defaultPrefix` (từ `../../lib/split`); `geodesicArea`, `polygonFromGeoJSON` (từ `../../lib/geo`); `BoundaryMap` prop `splitPreview` (Task 6); `create_plots_bulk` (Task 5).
- Produces: `createPlotsBulk(zone, plots, teamLeader?)` trong queries; UI chia tự động trong PlotForm.

- [ ] **Step 1: Thêm `createPlotsBulk` vào `queries.ts`**

Sau dòng `export const createPlot = ...`, thêm:

```ts
export const createPlotsBulk = (
  zone: string,
  plots: Array<{ block_name: string; area: number; boundary?: string; crops?: string[] }>,
  teamLeader?: string,
) => api.post("admin_api.create_plots_bulk", { zone, plots, team_leader: teamLeader });
```

- [ ] **Step 2: Thêm import + state cho chế độ chia tự động trong `PlotForm.tsx`**

Thêm vào import từ split + queries:

```ts
import { createZone, createPlot, updatePlot, getPlot, getZones, getTeamLeaders, createPlotsBulk } from "../../lib/queries";
import {
  splitPolygonByWeights, equalWeights, keepSmallWeights,
  plotCountByArea, areaRemainder, splitLabels, defaultPrefix,
} from "../../lib/split";
import { geodesicArea } from "../../lib/geo";
```

Thêm state (sau `const [cropTags, ...]`):

```ts
  // --- Chia tự động ---
  const [autoMode, setAutoMode] = React.useState(false);
  const [splitBy, setSplitBy] = React.useState<"count" | "area">("count");
  const [splitCount, setSplitCount] = React.useState<number>(4);
  const [splitArea, setSplitArea] = React.useState<number>(1000);
  const [prefix, setPrefix] = React.useState("");
  const [startIndex, setStartIndex] = React.useState<number>(1);
  const [remainderMode, setRemainderMode] = React.useState<"even" | "keepSmall">("even");
  const [preview, setPreview] = React.useState<{ label: string; polygon: Pt[]; area: number }[] | null>(null);
```

- [ ] **Step 3: Tính tiền tố mặc định + diện tích vùng từ vùng cha**

Sau `const parentBoundary = React.useMemo(...)` thêm:

```ts
  const selectedZone = zones.find((z) => z.id === (searchParams.get("zone") || zoneId));
  React.useEffect(() => {
    if (autoMode && selectedZone && !prefix) setPrefix(defaultPrefix(selectedZone.name || ""));
  }, [autoMode, selectedZone, prefix]);

  const zoneArea = React.useMemo(
    () => (parentBoundary && parentBoundary.length >= 3 ? geodesicArea(parentBoundary) : 0),
    [parentBoundary]
  );
```

- [ ] **Step 4: Hàm tính trọng số + xem trước**

Thêm trong component:

```ts
  const buildWeights = (): number[] => {
    if (splitBy === "count") return equalWeights(Math.max(1, Math.floor(splitCount)));
    const n = plotCountByArea(zoneArea, splitArea);
    return remainderMode === "keepSmall" ? keepSmallWeights(zoneArea, splitArea) : equalWeights(n);
  };

  const hasRemainder = splitBy === "area" && areaRemainder(zoneArea, splitArea) > 1;

  const handlePreview = () => {
    setError("");
    if (!parentBoundary || parentBoundary.length < 3) {
      setError("Vùng cha chưa có ranh giới — không thể chia tự động. Hãy vẽ ranh giới vùng trước.");
      return;
    }
    const weights = buildWeights();
    const parts = splitPolygonByWeights(parentBoundary, weights);
    const labels = splitLabels(prefix || "Lô", Math.max(1, Math.floor(startIndex)), parts.length);
    setPreview(parts.map((polygon, i) => ({ label: labels[i], polygon, area: Math.round(geodesicArea(polygon)) })));
  };
```

- [ ] **Step 5: Hàm tạo hàng loạt**

```ts
  const handleBulkCreate = async () => {
    if (!preview || !preview.length) return;
    setError("");
    setSaving(true);
    try {
      const plots = preview.map((p) => ({
        block_name: p.label,
        area: p.area,
        boundary: toGeoJSONPolygon(p.polygon),
        crops: cropTags,
      }));
      await createPlotsBulk(zoneId || (searchParams.get("zone") || ""), plots, teamLeader || undefined);
      navigate("/admin/zones");
    } catch (err: any) {
      setError(err?.message || "Tạo lô hàng loạt thất bại (có thể trùng tên lô).");
      setSaving(false);
    }
  };
```

- [ ] **Step 6: Nút chuyển chế độ + panel chia tự động (chỉ khi tạo lô, không phải vùng)**

Ngay sau header (`</div>` đóng khối header, trước khối `grid`), thêm (chỉ khi `!isEdit && !isZone`):

```tsx
      {!isEdit && !isZone && (
        <div className="flex gap-2">
          <Button type="button" variant={autoMode ? "secondary" : "primary"} onClick={() => { setAutoMode(false); setPreview(null); }}>
            Vẽ thủ công
          </Button>
          <Button type="button" variant={autoMode ? "primary" : "secondary"} onClick={() => setAutoMode(true)}>
            Chia tự động
          </Button>
        </div>
      )}
```

- [ ] **Step 7: Panel cấu hình chia tự động**

Trong cột form (lg:col-span-1), khi `autoMode`, thay form thủ công bằng panel chia. Bọc form hiện tại trong `{!autoMode && (...)}` và thêm panel `{autoMode && (...)}`:

```tsx
        {autoMode && !isEdit && !isZone && (
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-6 border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vùng cha</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={zoneId}
                onChange={(e) => { setZoneId(e.target.value); setPreview(null); setPrefix(""); }}>
                <option value="">Chọn vùng</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">Diện tích vùng: {zoneArea ? `${Math.round(zoneArea).toLocaleString()} m²` : "— (vùng chưa có ranh giới)"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cách chia</label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="radio" checked={splitBy === "count"} onChange={() => { setSplitBy("count"); setPreview(null); }} /> Theo số lô</label>
                <label className="flex items-center gap-2"><input type="radio" checked={splitBy === "area"} onChange={() => { setSplitBy("area"); setPreview(null); }} /> Theo diện tích</label>
              </div>
            </div>

            {splitBy === "count" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lô</label>
                <input type="number" min={1} value={splitCount || ""} onChange={(e) => { setSplitCount(Number(e.target.value)); setPreview(null); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diện tích mỗi lô (m²)</label>
                <input type="number" min={1} value={splitArea || ""} onChange={(e) => { setSplitArea(Number(e.target.value)); setPreview(null); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                {hasRemainder && (
                  <div className="mt-2 p-2 bg-amber-50 rounded text-sm text-amber-800">
                    {Math.round(zoneArea).toLocaleString()} m² ÷ {splitArea.toLocaleString()} m² dư {Math.round(areaRemainder(zoneArea, splitArea)).toLocaleString()} m².
                    <div className="flex gap-3 mt-1">
                      <label className="flex items-center gap-1"><input type="radio" checked={remainderMode === "even"} onChange={() => { setRemainderMode("even"); setPreview(null); }} /> Chia đều ({Math.round(zoneArea / plotCountByArea(zoneArea, splitArea)).toLocaleString()} m²/lô)</label>
                      <label className="flex items-center gap-1"><input type="radio" checked={remainderMode === "keepSmall"} onChange={() => { setRemainderMode("keepSmall"); setPreview(null); }} /> Giữ lô nhỏ</label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiền tố tên</label>
                <input value={prefix} onChange={(e) => { setPrefix(e.target.value); setPreview(null); }} placeholder="A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">STT bắt đầu</label>
                <input type="number" min={1} value={startIndex || ""} onChange={(e) => { setStartIndex(Number(e.target.value)); setPreview(null); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cây trồng (áp cho tất cả lô)</label>
              <div className="flex gap-4">
                {["Gấc", "Sâm"].map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={cropTags.includes(c)}
                      onChange={(e) => setCropTags((prev) => e.target.checked ? [...prev, c] : prev.filter((x) => x !== c))} />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tổ trưởng (áp cho tất cả)</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={teamLeader} onChange={(e) => setTeamLeader(e.target.value)}>
                <option value="">Chọn tổ trưởng</option>
                {leaders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={handlePreview}>Xem trước</Button>
              <Button type="button" variant="primary" className="flex-1" disabled={!preview || saving} onClick={handleBulkCreate}>
                {saving ? "Đang tạo..." : preview ? `Tạo ${preview.length} lô` : "Tạo lô"}
              </Button>
            </div>
            {preview && <p className="text-xs text-gray-500">Đã xem trước {preview.length} lô — bấm "Tạo" để lưu, hoặc đổi thông số rồi xem trước lại.</p>}
          </div>
        )}
```

- [ ] **Step 8: Truyền `splitPreview` vào `BoundaryMap`**

Sửa lời gọi `<BoundaryMap ... />` thành:

```tsx
          <BoundaryMap
            onChange={(a, pts) => { setArea(a); setPoints(pts); }}
            initial={initialPoints}
            constraint={autoMode ? undefined : parentBoundary}
            splitPreview={autoMode && preview ? preview.map((p) => ({ label: p.label, polygon: p.polygon })) : undefined}
          />
```

- [ ] **Step 9: Kiểm tra biên dịch + test lib**

Run: `cd frontend; npx tsc --noEmit; npx vitest run`
Expected: Không lỗi biên dịch; toàn bộ vitest PASS.

- [ ] **Step 10: Kiểm tra tay trên dev**

- Mở `http://localhost:8080` → Thêm lô → **Chia tự động**.
- Chọn vùng đã có ranh giới → Theo số lô = 6 → **Xem trước** → thấy 6 lô A1..A6 trên bản đồ, diện tích gần đều.
- Đổi sang Theo diện tích, nhập số lẻ (vd để dư) → thấy thông báo phần dư + 2 lựa chọn → đổi qua lại thấy số lô đổi.
- Tích Gấc+Sâm, chọn tổ trưởng → **Tạo N lô** → quay về danh sách, thấy các lô mới có nhãn cây.
- Vùng chưa có ranh giới → Xem trước báo lỗi rõ.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/lib/queries.ts frontend/src/components/admin/PlotForm.tsx
git commit -m "feat: chia lo tu dong (bisection) voi xem truoc bat buoc"
```

---

## Self-Review (đã thực hiện khi viết plan)

**Spec coverage:**
- Phần A nhãn cây → Task 4 (backend) + Task 7 (UI). ✓
- Phần B chia tự động bisection → Task 2/3 (lib) + Task 5 (bulk) + Task 6 (preview map) + Task 8 (UI). ✓
- Xử lý phần dư (giữ lô nhỏ / chia đều) → Task 2 helper + Task 8 UI radio. ✓
- Xem trước bắt buộc trước khi tạo → Task 8: nút "Tạo" disabled tới khi có `preview`. ✓
- Đặt tên theo tiền tố + STT → Task 2 `splitLabels`/`defaultPrefix` + Task 8. ✓
- Trùng tên do field unique chặn → Task 5 test + Task 8 báo lỗi. ✓
- `cropTags` không đụng key `crops` cũ → Task 4. ✓

**Type consistency:** `Pt`, `geodesicArea` (geo.ts) dùng nhất quán; `splitPolygonByWeights(polygon, weights) -> Pt[][]`; `createPlotsBulk(zone, plots, teamLeader?)` khớp `create_plots_bulk(zone, plots, team_leader)`; prop `splitPreview: {label, polygon}[]` khớp giữa Task 6 và Task 8.

**Placeholder scan:** Không có TBD/TODO; mọi step có lệnh/code cụ thể.
