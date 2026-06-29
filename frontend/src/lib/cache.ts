// Cache đọc dữ liệu vào localStorage để dùng khi offline (chỉ cho GET an toàn: việc, lô...).
const PREFIX = "akf_cache_";

export function cacheSet(key: string, val: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(val));
  } catch {
    /* hết dung lượng -> bỏ qua, không chặn nghiệp vụ */
  }
}

export function cacheGet<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(PREFIX + key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}
