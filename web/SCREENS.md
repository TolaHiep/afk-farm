# 📖 Hướng dẫn Chi tiết Các Màn hình

## Web Admin - Desktop

### 1. Login Page
**Đường dẫn**: `/admin/login`

**Thành phần**:
- Logo 🌾 với branding
- Form đăng nhập (Email + Password)
- "Nhớ đăng nhập" checkbox
- Eye icon để show/hide password
- Demo credentials
- Link đến Mobile App

**Mock Data**: Admin @ admin@nongrai.vn

---

### 2. Dashboard
**Đường dẫn**: `/admin`

**Layout**: Sidebar (trái) + Main content (phải)

**Thành phần chính**:
1. **Welcome Banner**: "Chào mừng, [Tên User]"
2. **Stats Cards** (4 cột):
   - Tổng Vùng: 12
   - Tổng Lô: 48
   - Tổng Tổ: 8
   - Việc Hôm nay: 24

3. **Alerts & Notifications**:
   - Lô A1 - Quá hạn (Đỏ)
   - Lô B3 - Bất thường sâu bệnh (Đỏ)
   - Lô C2 - Vật tư thiếu (Vàng)

4. **Quick Actions**:
   - Quản lý Lô
   - Bản đồ Nhiệt
   - Lịch Công việc
   - Quản lý Tổ

5. **Chart Placeholder**:
   - "Công việc theo vùng (7 ngày gần đây)"

---

### 3. Quản lý Vùng & Lô
**Đường dẫn**: `/admin/zones`

**Tabs**:

#### Tab 1: Vùng
- **Table columns**: Tên Vùng | Diện tích (ha) | Số Lô | Hành động
- **Mock data**:
  | Tên Vùng | Diện tích | Số Lô |
  |----------|----------|--------|
  | Vùng Đông | 50 ha | 8 |
  | Vùng Tây | 45 ha | 6 |
  | Vùng Nam | 60 ha | 10 |

- **Form tạo vùng mới**:
  - Input: Tên vùng
  - Button: Tạo | Hủy

#### Tab 2: Lô
- **Table columns**: Tên Lô | Vùng | Diện tích | Trạng thái | Hành động
- **Status badges**:
  - 🟢 Xanh: "Đúng hạn"
  - 🟡 Vàng: "Cảnh báo"
  - 🔴 Đỏ: "Quá hạn"

- **Mock data**:
  | Tên Lô | Vùng | Diện tích | Trạng thái |
  |--------|------|----------|-----------|
  | A1 | Vùng Đông | 5 ha | Xanh |
  | A2 | Vùng Đông | 6 ha | Vàng |
  | B1 | Vùng Tây | 7 ha | Đỏ |

- **Form tạo lô mới**:
  - Input: Tên lô
  - 💡 Note: "Bạn có thể vẽ ranh giới lô trên bản đồ"
  - Button: Tạo & Vẽ Bản đồ | Hủy

---

### 4. Quản lý Tổ
**Đường dẫn**: `/admin/teams`

**Table columns**: Tên Tổ | Tổ trưởng | Số thành viên | Hành động

**Mock data**:
| Tên Tổ | Tổ trưởng | Số thành viên |
|--------|-----------|---------------|
| Tổ 1 | Nguyễn Văn A | 5 |
| Tổ 2 | Trần Thị B | 6 |
| Tổ 3 | Lê Văn C | 4 |

**Actions**: Sửa | Xóa

---

### 5. Quy trình Canh tác
**Đường dẫn**: `/admin/processes`

**Buttons**: [+ Tạo Quy trình] [📤 Import Excel]

**Table columns**: Loại cây | Bước | Công/ha | Tần suất | Hành động

**Mock data**:
| Loại cây | Bước | Công/ha | Tần suất |
|----------|------|---------|---------|
| Gấc | Chuẩn bị đất | 10 | 1 lần |
| Gấc | Trồng | 15 | 1 lần |
| Sâm | Chuẩn bị | 20 | 1 lần |

---

### 6. Chu kỳ Cây trồng
**Đường dẫn**: `/admin/crop-cycles`

**Table columns**: Lô | Cây | Ngày bắt đầu | Dự kiến kết thúc | Trạng thái | Hành động

**Status badges**:
- "Đang diễn ra" (xanh)
- "Sắp bắt đầu" (vàng)
- "Hoàn thành" (xám)

**Mock data**:
| Lô | Cây | Ngày bắt đầu | Dự kiến | Trạng thái |
|----|-----|--------------|---------|-----------|
| A1 | Gấc | 2024-06-01 | 2024-08-31 | Đang diễn ra |
| A2 | Sâm | 2024-07-15 | 2024-10-15 | Sắp bắt đầu |

---

### 7. Lịch Công việc (10 ngày)
**Đường dẫn**: `/admin/schedule`

**Filters**:
- Tìm vùng...
- Tìm lô...
- Tìm tổ trưởng...

**Date Navigation**: `← Tuần 24-30 tháng 6 →`

**Task Cards** (dạng Gantt simplified):
- Tên việc (lớn)
- Lô: A1 - Gấc | Tổ: Nguyễn Văn A | 2024-06-16
- Status badge
- Nút: Gán lại | Lùi lịch

**Mock statuses**:
- ✅ Hoàn thành (xanh)
- 🔵 Đang làm (xanh nhạt)
- ⏳ Chưa bắt đầu (xám)
- ⛔ Quá hạn (đỏ)

---

### 8. Bản đồ Nhiệt
**Đường dẫn**: `/admin/heat-map`

**Filters**:
- Date picker
- Select cây: Tất cả | Gấc | Sâm
- Select trạng thái

**Main area** (2/3 width):
- Placeholder: "Bản đồ tương tác sẽ được hiển thị tại đây"
- Color legend:
  - 🟢 Xanh: "Đúng hạn"
  - 🟡 Vàng: "Cảnh báo"
  - 🔴 Đỏ: "Quá hạn"

**Right panel** (1/3 width):
- **Danh sách Lô**:
  - Lô A1 (Xanh) - Đúng hạn - 3 công việc
  - Lô A2 (Vàng) - Cảnh báo - 5 công việc
  - Lô B1 (Đỏ) - Quá hạn - 2 công việc

- **Khi click Lô** → Chi tiết panel mở:
  - Trạng thái: [badge]
  - Công việc: 5
  - Nút: [Gán lại] [Lùi lịch]

**Legend box**: Giải thích từng màu sắc

---

### 9. KPI Tổ trưởng
**Đường dẫn**: `/admin/kpi`

**Filters**: [Tháng 6] [Năm 2024]

**Table columns**: Tổ | Đúng hạn | Quá hạn | Hoàn thành | Báo cáo đầy đủ | Bất thường | Tổng công (giờ) | Hành động

**Status badges**:
- Đúng hạn: 🟢 (xanh)
- Quá hạn: 🔴 (đỏ)
- Bất thường: 🟡 (vàng)

**Mock data**:
| Tổ | Đúng hạn | Quá hạn | Hoàn thành | Báo cáo | Bất thường | Tổng công |
|----|----------|---------|----------|---------|-----------|-----------|
| Tổ 1 | 45 | 2 | 47 | 47 | 1 | 180 |
| Tổ 2 | 52 | 3 | 55 | 54 | 2 | 210 |
| Tổ 3 | 38 | 5 | 43 | 42 | 3 | 165 |

**Summary cards** (dưới table):
- Tổng công việc đúng hạn: 135
- Tổng công việc quá hạn: 10
- Bất thường: 6
- Tổng công (giờ): 555

---

### 10. Cảnh báo
**Đường dẫn**: `/admin/alerts`

**Display**:
- "Không có cảnh báo" / "[X] mới" badge

**Filters**: [Tất cả] [Chưa đọc] [Quá hạn] [Bất thường]

**Alert items**:
- **Left**: Icon (⏰ / ⚠️ / 📦) + Title + Message + Details
  - Lô: A1
  - Thời gian: 2024-06-15 09:30
  
- **Right buttons**: [👁️ Đánh dấu] [🗑️ Xóa]

**Color coding**:
- Overdue (Đỏ): Công việc quá hạn
- Abnormality (Vàng): Bất thường mới
- Supply (Cam): Vật tư sau này

---

## Mobile PWA - Tổ trưởng

### 1. Login Page
**Đường dẫn**: `/mobile/login`

**Design**: Cực đơn giản, nút lớn, chữ lớn

**Thành phần**:
- 📱 Logo icon (xanh lá, tròn)
- "Ứng dụng Tổ trưởng" (h1)
- "Quản lý sản xuất nông trại" (subtitle)
- Email input (lớn, icon mail)
- Password input (lớn, icon lock, eye toggle)
- "Nhớ đăng nhập" checkbox
- **[Đăng nhập]** button (lớn, xanh lá, padding to)
- Demo credentials
- Phiên bản + Hỗ trợ

---

### 2. Việc hôm nay
**Đường dẫn**: `/mobile`

**Header** (Fixed, xanh lá):
- "Chào, Tổ trưởng A"
- "Việc hôm nay" (h1)

**Tabs** (3 cột):
- [**Hôm nay**] [Ngày mai] [Ngày kia]
- Active tab: nền xanh lá, trắng chữ
- Inactive: nền xám, chữ đen

**Task Cards** (Danh sách):
- Card lớn, border xám
- **Tên việc** (h3, đậm)
- **Grid 2x2**:
  - 📍 Lô: A1 | 🌱 Cây: Gấc
  - ⏰ 2024-06-15 | [Status badge]
- "Chi tiết công việc →"

**Status badges**:
- Chưa bắt đầu: xám
- Đang làm: xanh dương
- Hoàn thành: xanh lá

**Mock data**:
1. "Tưới nước" | A1 | Gấc | Chưa bắt đầu
2. "Bón phân" | A1 | Gấc | Đang làm
3. "Phun thuốc" | B1 | Sâm | Chưa bắt đầu

**Bottom button** (Fixed):
- 📋 **[Báo cáo cuối ngày]** (xanh lá, lớn)

---

### 3. Chi tiết Công việc
**Đường dẫn**: `/mobile/task-detail/[id]`

**Header** (Fixed, xanh lá):
- ← [Quay lại] | "Chi tiết công việc" | Tên việc

**Content sections**:

1. **Task Info Card**:
   - **Lô**: A1 (lớn)
   - **Cây trồng**: Gấc

2. **SOP Card** (Quy trình chuẩn):
   - ⚠️ Icon
   - "SOP (Quy trình chuẩn)"
   - Text box (gray bg):
     "Tưới đều nước từ 6-7 giờ sáng. Lượng nước: 30mm. Kiểm tra độ ẩm đất trước khi tưới."

3. **Status Indicator**:
   - Dot (🟢/🔵/✅) + Label
   - "Trạng thái: [Chưa bắt đầu / Đang làm / Hoàn thành]"

4. **Notes Textarea**:
   - "Ghi chú"
   - Placeholder: "Ghi chú về công việc..."
   - Rows: 4

5. **Completion Message** (nếu hoàn thành):
   - 🟢 Green box
   - "✓ Công việc đã hoàn thành!"
   - "Ghi chú: [notes]"

**Bottom buttons** (Fixed):

- **Khi pending**:
  - ▶️ **[Bắt đầu]** (lớn, xanh lá)

- **Khi in_progress**:
  - ✅ **[Hoàn thành]** (lớn, xanh, disabled nếu notes trống)

- **Khi completed**:
  - **[Quay lại]** (xanh lá)

---

### 4. Báo cáo Cuối ngày
**Đường dẫn**: `/mobile/daily-report`

**Header** (Fixed, xanh lá):
- ← [Quay lại] | "Báo cáo" | "Cuối ngày"

**Content sections**:

1. **Số liệu Sản xuất** (Bắt buộc):
   - Label: "Số liệu sản xuất"
   - Input: number field
   - Placeholder: "VD: 150 (kg/ha)"
   - Helper text: "Số liệu ghi lại trong ngày"

2. **Ghi chú** (Tuỳ chọn):
   - Label: "Ghi chú (tuỳ chọn)"
   - Textarea: 3 rows
   - Placeholder: "Ghi chú thêm về công việc..."

3. **Báo cáo Bất thường** (Checkbox section):
   - ☑️ [Báo cáo bất thường]
   - ⚠️ Icon
   
   **Nếu checked → mở 3 fields**:
   
   a) **Loại bất thường** (Bắt buộc):
      - Dropdown
      - Options:
        - -- Chọn loại --
        - Thời tiết
        - Côn trùng
        - Bệnh
        - Vật tư thiếu
        - Khác
   
   b) **Mô tả chi tiết**:
      - Textarea: 3 rows
      - Placeholder: "Mô tả chi tiết bất thường..."
   
   c) **Ảnh chứng minh** (Bắt buộc nếu có bất thường):
      - File input (dashed border)
      - 📷 Icon + "Chọn ảnh"
      - Hiện tên file nếu chọn

4. **Info box** (Xanh dương):
   - 💡 "Mẹo: Báo cáo chi tiết giúp quản lý theo dõi tốt hơn"

**Bottom button** (Fixed):
- 📤 **[Gửi báo cáo]** (lớn, xanh lá)
- Disabled nếu số liệu trống
- Loading state: "Đang gửi..."

**Submission flow**:
1. Validate form
2. Show toast: "Báo cáo đã gửi!"
3. Clear form
4. Redirect to `/mobile` sau 1.5s

**Offline mode**:
- Nếu offline, lưu vào offline store
- Show: "⏳ Chưa gửi" item trong danh sách
- Nút: "🔄 Đồng bộ ngay"

---

## 🎨 Responsive Design

### Desktop (Admin)
- Sidebar fixed 256px
- Main content fluid
- Tables scrollable
- Cards grid 1-4 columns

### Tablet
- Sidebar collapsible
- Mobile menu toggle
- 2-3 column grid

### Mobile (PWA)
- Full width
- Bottom fixed buttons
- Vertical stacking
- Touch-friendly (44px+ buttons)
- Large fonts (16px+)
- Simplified forms

---

## 🔄 Data Flow

```
Admin Setup:
Login → Quản lý Vùng/Lô → Quản lý Tổ → Quy trình 
→ Chu kỳ → Hệ thống sinh Task

Admin Monitor:
Dashboard → Heat Map → Chi tiết → Gán lại/Lùi lịch

Tổ trưởng:
Login → Việc hôm nay → Chi tiết → Bắt đầu/Hoàn thành 
→ Báo cáo cuối ngày → Gửi
```

---

## 📝 Mock Data

Tất cả mock data được hardcode trong component để demo. Khi kết nối API backend, thay thế fetch API calls.

Ví dụ:
```javascript
// Hiện tại
const [tasks, setTasks] = useState<Task[]>([
  { id: '1', name: 'Tưới nước', ... }
])

// Sau khi kết nối API
useEffect(() => {
  fetchTasks().then(setTasks)
}, [])
```

---

**Cập nhật lần cuối**: 2024-06-15
