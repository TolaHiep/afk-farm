// Ngày hiện tại theo múi giờ trình duyệt, dạng YYYY-MM-DD.
// Dùng cho mặc định lịch/lọc/tạo chu kỳ — tránh hardcode ngày cố định.
export function todayYMD(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
