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

async function request(
  method: string,
  opts: { body?: unknown; params?: Record<string, string> } = {},
): Promise<any> {
  const qs = opts.params ? "?" + new URLSearchParams(opts.params).toString() : "";
  const res = await fetch(`${BASE}.${method}${qs}`, {
    method: opts.body !== undefined ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?._server_messages || json?.message || `API ${method} lỗi (${res.status})`;
    throw new ApiError(typeof msg === "string" ? msg : JSON.stringify(msg), res.status);
  }
  return json.message;
}

export const api = {
  get: (method: string, params?: Record<string, string>) => request(method, { params }),
  post: (method: string, body?: unknown) => request(method, { body: body ?? {} }),
};
