# Thiết kế: Chia lô tự động (bisection) + Nhãn cây trên lô

Ngày: 2026-06-17
Trạng thái: Đã duyệt thiết kế, chờ review spec

## Bối cảnh & vấn đề

Hiện tại tạo lô phải vẽ ranh giới thủ công trên bản đồ (tích từng góc như tạo vùng)
— mất thời gian và khó chính xác tuyệt đối. Ngoài ra dropdown "Loại cây" trong form
tạo lô là **nút chết** (không có state, không gửi backend), nên mỗi lô tưởng như chỉ
chọn được Gấc *hoặc* Sâm, không chọn được cả hai.

Hai tính năng cần thêm:
- **A. Nhãn cây trên lô**: cho phép tích cả Gấc + Sâm cho một lô.
- **B. Chia lô tự động**: chọn một vùng đã có ranh giới, nhập số lô hoặc diện tích/lô,
  hệ thống tự cắt vùng thành các lô đều nhau, đặt tên theo tên vùng + STT (A1, A2...).

## Mô hình dữ liệu hiện có (tham chiếu)

- `Farm Zone` (vùng): zone_name, area, boundary (GeoJSON), status.
- `Farm Block` (lô): block_name (unique, autoname theo field), zone (Link), area,
  boundary (GeoJSON Code), team_leader (Link User), status.
- `Crop Cycle` (chu kỳ cây): block, crop (Select Gấc/Sâm), cultivation_process, start_date, status.
- `serialize_plot` **đã có** key `crops` (mảng object lấy từ Crop Cycle, kèm trạng thái)
  → nhãn cây mới phải dùng key khác để không phá logic này.

---

## PHẦN A — Nhãn cây trên lô

Quyết định: cây ở đây chỉ là **nhãn hiển thị/lọc** trên lô, **không** tạo Crop Cycle.
Độc lập với màn Quản lý chu kỳ cây. (Lưu ý: các màn lấy cây từ Crop Cycle — vd báo cáo
mobile — sẽ không tự đồng bộ với nhãn này; chấp nhận được theo yêu cầu.)

### Backend
- `Farm Block` doctype: thêm field `crops` kiểu **Small Text**, lưu chuỗi `"Gấc,Sâm"`.
- `create_plot` / `update_plot`: nhận thêm tham số `crops` (chuỗi comma hoặc list → chuẩn hóa chuỗi).
- `serialize_plot`: trả thêm key `cropTags: ["Gấc", "Sâm"]` (parse từ field `crops`).

### Frontend
- `PlotForm.tsx`: thay dropdown chết bằng **2 checkbox ☐ Gấc ☐ Sâm** (state mảng `cropTags`),
  áp dụng cho cả tạo mới và sửa; gửi `crops` khi submit.
- Nạp `cropTags` khi sửa lô (từ `getPlot`).
- Thẻ/danh sách lô: hiện badge cây theo `cropTags`.

---

## PHẦN B — Chia lô tự động (bisection đệ quy)

### Lựa chọn thuật toán
**Bisection đệ quy** (cắt đôi theo cạnh dài, đệ quy) — đảm bảo **diện tích bằng nhau tuyệt đối**
kể cả khi vùng méo, hình lô gọn hơn kiểu "dải". Vùng chữ nhật → kết quả đều như lưới ô vuông.

### Giao diện (trong `PlotForm.tsx`, chỉ ở chế độ tạo mới)
Thêm nút chuyển chế độ đầu form: `[ Vẽ thủ công ]  [ Chia tự động ]`.

Chế độ **Chia tự động** hiện:
- **Vùng cha** (bắt buộc, phải có ranh giới). Vùng chưa vẽ ranh giới → báo lỗi, chặn chia.
- **Cách chia**:
  - `( ) Theo số lô` → nhập **N**.
  - `( ) Theo diện tích` → nhập **m²/lô**.
- **Tiền tố tên**: mặc định suy từ tên vùng ("Vùng A" → `A`), sửa được.
- **STT bắt đầu**: mặc định 1 → ra `A1, A2, ... An`.
- **Cây trồng** (checkbox Gấc/Sâm) + **Tổ trưởng** (tùy chọn): áp cho **tất cả** lô tạo ra.
- Nút **"Xem trước"** (BẮT BUỘC trước khi tạo).
- Nút **"Tạo N lô"** chỉ bật sau khi đã xem trước.

### Xử lý phần dư (chỉ ở chế độ "Theo diện tích")
- Nếu diện tích vùng chia **hết** cho m²/lô → tạo luôn, không hỏi.
- Nếu **có dư** (vd 6.500 ÷ 1.000 = 6 lô đủ + dư 500) → ở bước Xem trước hiện thông báo,
  cho người dùng chọn:
  - **Giữ lô nhỏ**: `N_full` lô × input + 1 lô × phần dư. (vd 6 × 1.000 + 1 × 500 = 7 lô)
  - **Chia đều**: `N_full` lô × (diện tích vùng / N_full). (vd 6 × 1.083 m²)
  - `N_full = floor(diện tích vùng / m²/lô)`.

### Thuật toán — file mới `frontend/src/lib/split.ts`
`splitPolygonByWeights(polygon: LatLng[], weights: number[]): LatLng[][]`
- Chiếu toạ độ về mặt phẳng cục bộ (x = lng·cos(lat₀), y = lat) để tính diện tích chuẩn.
- Đệ quy `recurse(poly, weights)`:
  - `weights.length === 1` → trả `[poly]`.
  - Tách `weights` thành 2 nhóm (nửa đầu / nửa sau).
  - Chọn cạnh dài hơn của bounding box, **tìm nhị phân** đường cắt sao cho
    diện tích nửa trái / tổng = tổng(nhóm đầu) / tổng(tất cả).
  - Cắt polygon bằng nửa mặt phẳng (Sutherland–Hodgman, vì đường cắt là thẳng).
  - Đệ quy 2 nửa, ghép kết quả.
- Unproject về lat/lng.
- Áp dụng:
  - Theo số lô / chia đều → `weights` toàn giá trị bằng nhau (độ dài N).
  - Giữ lô nhỏ → `weights = [input, input, ..., input, remainder]`.
- Diện tích mỗi lô tính lại bằng `geodesicArea` (tách từ `BoundaryMap.tsx` ra `geo.ts` dùng chung).

### Đặt tên & trùng tên
- Tên lô = `tiền tố + (STT bắt đầu + i)`, vd `A1..An`.
- Field `block_name` `unique` chặn trùng ở backend; frontend báo lỗi rõ nếu trùng
  (gợi ý đổi tiền tố / STT bắt đầu).

### Backend — `admin_api.py`
`create_plots_bulk(zone, plots, team_leader=None)`:
- `plots` = JSON list `{block_name, area, boundary, crops}`.
- Tạo từng `Farm Block` trong một request; trả về danh sách `serialize_plot`.
- Lỗi 1 lô (vd trùng tên) → throw, frontend hiện lỗi.

### `queries.ts`
- `createPlotsBulk(zone, plots, teamLeader?)`.

### Xem trước trên bản đồ
- Mở rộng `BoundaryMap` nhận prop tùy chọn `splitPreview?: {label: string; polygon: Pt[]}[]`:
  khi có prop này, vẽ N polygon kèm nhãn ở chế độ chỉ đọc (tắt click thêm điểm), canh khung
  nhìn ôm trọn các lô. Tái dùng đúng map hiện có, không tạo component mới.

### Độ chính xác & chỉnh tay
- Diện tích lưu cho mỗi lô là diện tích thật của polygon (trắc địa) → đều nhau, sai số làm tròn nhỏ.
- Sau khi tạo, vẫn sửa từng lô như thường (kéo điểm ranh giới) để tinh chỉnh.

---

## Phạm vi KHÔNG làm (YAGNI)
- Không tự tạo Crop Cycle từ nhãn cây.
- Không chia theo kiểu lưới ô vuông / dải (chỉ bisection).
- Không hỗ trợ vùng đa-polygon (MultiPolygon) — chỉ Polygon đơn.

## Kiểm thử
- Unit test `splitPolygonByWeights`: tổng diện tích các mảnh ≈ diện tích gốc;
  tỉ lệ diện tích từng mảnh ≈ weights; mảnh nằm trong polygon gốc; hình vuông chia N đều.
- Test trùng tên ở `create_plots_bulk`.
- Test `serialize_plot` trả `cropTags` đúng; create/update plot lưu `crops`.
