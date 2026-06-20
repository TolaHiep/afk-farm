import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, AlertTriangle, FileText, Circle } from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";
import { getNotifications } from "../../lib/queries";
import { isRead, markRead, markAllRead } from "../../lib/notificationsRead";

type Filter = "all" | "unread" | "overdue" | "anomaly";

export function Notifications() {
  const navigate = useNavigate();
  const [raw, setRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [, force] = useState(0); // bump để re-render sau markRead/markAll

  useEffect(() => {
    getNotifications()
      .then(setRaw)
      .catch((e) => console.error("Failed to fetch notifications:", e))
      .finally(() => setLoading(false));
  }, []);

  // KHÔNG dùng useMemo — read-state nằm trong localStorage, không phải dep của React.
  const notifications = raw.map((n: any) => ({ ...n, read: isRead(n.id) }));
  const filtered =
    filter === "unread"  ? notifications.filter((n) => !n.read)
    : filter === "overdue" ? notifications.filter((n) => n.type === "overdue")
    : filter === "anomaly" ? notifications.filter((n) => n.type === "anomaly")
    : notifications;

  if (loading) return <div className="p-10 text-center text-gray-400">Đang tải…</div>;

  const onMarkAll = () => {
    markAllRead(notifications.map((n) => n.id));
    force((v) => v + 1);
  };
  const onItemClick = (n: any) => {
    if (!isRead(n.id)) markRead(n.id);
    force((v) => v + 1);
    // Điều hướng tới chính việc/bất thường được nhắc tới, không chỉ trang danh sách
    if (n.anomalyId) {
      navigate(`/admin/anomaly/${n.anomalyId}`);
    } else if (n.taskId) {
      // Mở Lịch tới đúng ngày + popup Chi tiết việc
      const qs = new URLSearchParams({ task: n.taskId });
      if (n.taskDate) qs.set("date", n.taskDate);
      navigate(`/admin/calendar?${qs.toString()}`);
    } else if (n.type === "report") {
      navigate("/admin/reports");
    }
  };

  const counts = {
    all: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    overdue: notifications.filter((n) => n.type === "overdue").length,
    anomaly: notifications.filter((n) => n.type === "anomaly").length,
  };

  const tab = (key: Filter, label: string, count: number) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`px-6 py-3 font-medium border-b-2 -mb-px ${
        filter === key
          ? "text-green-600 border-green-600"
          : "text-gray-600 border-transparent hover:text-gray-900"
      }`}
    >
      {label} ({count})
    </button>
  );

  const getIcon = (type: string) => {
    switch (type) {
      case "overdue": return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "anomaly": return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "report":  return <FileText className="w-5 h-5 text-blue-600" />;
      default:        return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "overdue": return "Quá hạn";
      case "anomaly": return "Bất thường";
      case "report":  return "Báo cáo";
      default:        return "Thông báo";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Thông báo & Cảnh báo</h2>
        <button
          onClick={onMarkAll}
          disabled={counts.unread === 0}
          className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200 flex overflow-x-auto">
          {tab("all",     "Tất cả",      counts.all)}
          {tab("unread",  "Chưa đọc",    counts.unread)}
          {tab("overdue", "Quá hạn",     counts.overdue)}
          {tab("anomaly", "Bất thường",  counts.anomaly)}
        </div>

        <div className="divide-y divide-gray-200">
          {filtered.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => onItemClick(notification)}
              className={`w-full text-left block p-4 hover:bg-gray-50 transition-colors ${!notification.read ? "bg-blue-50" : ""}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={notification.type === "overdue" ? "danger" : notification.type === "anomaly" ? "warning" : "pending"}>
                      {getTypeLabel(notification.type)}
                    </StatusBadge>
                    {!notification.read && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">Mới</span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{notification.title}</h4>
                  <p className="text-sm text-gray-600">{notification.description}</p>
                  <p className="text-xs text-gray-500 mt-2">{new Date(notification.date).toLocaleString("vi-VN")}</p>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-gray-400 text-sm">Không có thông báo phù hợp.</div>
          )}
        </div>
      </div>
    </div>
  );
}
