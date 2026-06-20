// Lưu danh sách ID thông báo đã đọc trong localStorage (per-trình-duyệt, per-user).
// Backend không persist read-state (thông báo là dữ liệu suy ra) — đủ cho nhu cầu hiện tại.
// ponytail: client-side state; nếu cần đồng bộ nhiều thiết bị thì làm doctype riêng sau.

const KEY = "akf_read_notifs";

function load(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
  catch { return new Set(); }
}
function save(s: Set<string>) {
  try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* quota */ }
}

export function isRead(id: string): boolean {
  return load().has(id);
}
export function markRead(id: string) {
  const s = load(); s.add(id); save(s);
}
export function markAllRead(ids: string[]) {
  const s = load(); ids.forEach((id) => s.add(id)); save(s);
}
