// Hàng đợi offline thật: lưu localStorage, gửi lại khi có mạng.
// Backend đã idempotent theo client_uuid (submit_report, complete_task) nên gửi lại an toàn.
import { ApiError } from "./api";
import { submitReport, submitSupport, completeTask } from "./queries";

export type OfflineKind = "report" | "support" | "task";
export type OfflineItem = {
  id: string; // duy nhất, đồng thời dùng làm client_uuid khi áp dụng
  kind: OfflineKind;
  title: string; // nhãn hiển thị ở màn Đồng bộ
  date: string; // ISO thời điểm xếp hàng
  payload: any; // tham số để gửi lại
};

const KEY = "akf_offline_queue";

export const OFFLINE_BUDGET = 4_500_000; // ~4.5MB: tran an toan duoi gioi han localStorage ~5MB

export function uid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `off-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function read(): OfflineItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function write(items: OfflineItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listOffline(): OfflineItem[] {
  return read();
}
export function offlineCount(): number {
  return read().length;
}

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

export function enqueueOffline(item: OfflineItem) {
  const items = read();
  items.push(item);
  write(items);
}
export function removeOffline(id: string) {
  write(read().filter((i) => i.id !== id));
}

// Lỗi mạng (không tới được server) ≠ lỗi nghiệp vụ từ server (ApiError có status).
export function isNetworkError(e: unknown): boolean {
  return !(e instanceof ApiError);
}

async function replayItem(item: OfflineItem): Promise<void> {
  if (item.kind === "report") await submitReport(item.payload);
  else if (item.kind === "support") await submitSupport(item.payload);
  else if (item.kind === "task") {
    const p = item.payload;
    await completeTask(p.task, p.client_uuid, p.photos, p.photo_meta);
  }
}

// Gửi lại toàn bộ hàng đợi. Lỗi mạng → giữ lại; lỗi nghiệp vụ → bỏ khỏi hàng đợi để không kẹt.
export async function replayOffline(): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const item of read()) {
    try {
      await replayItem(item);
      removeOffline(item.id);
      ok++;
    } catch (e) {
      if (isNetworkError(e)) {
        failed++; // vẫn mất mạng → giữ lại để thử sau
      } else {
        removeOffline(item.id); // server từ chối → bỏ khỏi hàng đợi
        failed++;
      }
    }
  }
  return { ok, failed };
}
