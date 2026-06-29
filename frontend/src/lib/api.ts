// Lớp gọi API tới backend Frappe (akf_farm). Endpoint dạng /api/method/akf_farm.api.<module>.<fn>
// Same-origin: dev dùng Vite proxy, prod dùng nginx. Frappe bọc kết quả trong { message: ... }.
const BASE = "/api/method/akf_farm.api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Timeout mặc định: mạng kém thì rớt sớm để vào hàng đợi offline, không bắt người dùng chờ.
const DEFAULT_TIMEOUT_MS = 12000;

async function request(
  method: string,
  opts: { body?: unknown; params?: Record<string, string>; timeoutMs?: number } = {},
): Promise<any> {
  // Mất mạng -> báo lỗi mạng NGAY, không treo chờ timeout TCP của hệ điều hành (2-3 phút).
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("Mất kết nối mạng.");  // không phải ApiError -> isNetworkError -> xếp hàng offline
  }
  const qs = opts.params ? "?" + new URLSearchParams(opts.params).toString() : "";
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS) : null;
  try {
    const res = await fetch(`${BASE}.${method}${qs}`, {
      method: opts.body !== undefined ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctrl?.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(parseFrappeError(json) || `API ${method} lỗi (${res.status}).`, res.status);
    }
    return json.message;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Frappe đóng gói lỗi vào `_server_messages` (JSON-string chứa mảng JSON-string {message:"<html>..."}).
// Trả về chuỗi sạch để hiển thị cho người dùng.
function parseFrappeError(json: any): string {
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sm = json?._server_messages;
  if (typeof sm === "string") {
    try {
      const arr = JSON.parse(sm);
      const msgs = (Array.isArray(arr) ? arr : [arr])
        .map((x) => { try { return JSON.parse(x); } catch { return { message: String(x) }; } })
        .map((o) => stripHtml(o?.message || ""))
        .filter(Boolean);
      if (msgs.length) return msgs.join(" ");
    } catch { /* fallthrough */ }
  }
  if (typeof json?.message === "string") return stripHtml(json.message);
  return "";
}

export const api = {
  get: (method: string, params?: Record<string, string>) => request(method, { params }),
  post: (method: string, body?: unknown) => request(method, { body: body ?? {} }),
};
