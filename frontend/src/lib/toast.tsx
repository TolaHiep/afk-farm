import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type Kind = "success" | "error" | "info" | "warning";
export type ToastItem = { id: number; kind: Kind; message: string };

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<(it: ToastItem[]) => void>();
function emit() { listeners.forEach((fn) => fn(items)); }

function push(kind: Kind, message: string) {
  const id = nextId++;
  items = [...items, { id, kind, message }];
  emit();
  setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
  return id;
}
function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (m: string) => push("success", m),
  error: (m: string) => push("error", m),
  info: (m: string) => push("info", m),
  warning: (m: string) => push("warning", m),
};

const STYLES: Record<Kind, { bg: string; ring: string; icon: typeof CheckCircle2; iconCls: string }> = {
  success: { bg: "bg-white",      ring: "ring-green-200",  icon: CheckCircle2, iconCls: "text-green-600" },
  error:   { bg: "bg-white",      ring: "ring-red-200",    icon: AlertCircle,  iconCls: "text-red-600" },
  warning: { bg: "bg-white",      ring: "ring-amber-200",  icon: AlertCircle,  iconCls: "text-amber-600" },
  info:    { bg: "bg-white",      ring: "ring-blue-200",   icon: Info,         iconCls: "text-blue-600" },
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items);
  useEffect(() => { listeners.add(setList); return () => { listeners.delete(setList); }; }, []);
  if (!list.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm pointer-events-none">
      {list.map((t) => {
        const s = STYLES[t.kind];
        const Icon = s.icon;
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`${s.bg} pointer-events-auto flex items-start gap-3 p-3 pr-2 rounded-xl shadow-lg ring-1 ${s.ring} animate-[fadeIn_.15s_ease-out]`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${s.iconCls}`} />
            <p className="flex-1 text-sm text-gray-800 leading-snug whitespace-pre-line">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Đóng" className="text-gray-400 hover:text-gray-700 p-1 -m-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
