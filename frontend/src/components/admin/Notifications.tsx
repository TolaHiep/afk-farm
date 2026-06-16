import React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AlertCircle, AlertTriangle, FileText, Circle } from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";
import { getNotifications } from "../../lib/queries";

export function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getNotifications();
        setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Đang tải…</div>;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "overdue": return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "anomaly": return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "report": return <FileText className="w-5 h-5 text-blue-600" />;
      default: return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "overdue": return "Quá hạn";
      case "anomaly": return "Bất thường";
      case "report": return "Báo cáo";
      default: return "Thông báo";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Thông báo & Cảnh báo</h2>
        <button className="text-sm text-green-600 hover:text-green-700 font-medium">
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button className="px-6 py-3 font-medium text-green-600 border-b-2 border-green-600">
              Tất cả ({notifications.length})
            </button>
            <button className="px-6 py-3 font-medium text-gray-600 hover:text-gray-900">
              Chưa đọc ({notifications.filter(n => !n.read).length})
            </button>
            <button className="px-6 py-3 font-medium text-gray-600 hover:text-gray-900">
              Quá hạn ({notifications.filter(n => n.type === "overdue").length})
            </button>
            <button className="px-6 py-3 font-medium text-gray-600 hover:text-gray-900">
              Bất thường ({notifications.filter(n => n.type === "anomaly").length})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-gray-200">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              to={notification.anomalyId ? `/admin/anomaly/${notification.anomalyId}` : "#"}
              className={`block p-4 hover:bg-gray-50 transition-colors ${
                !notification.read ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={notification.type === "overdue" ? "danger" : notification.type === "anomaly" ? "warning" : "pending"}>
                      {getTypeLabel(notification.type)}
                    </StatusBadge>
                    {!notification.read && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                        Mới
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-600">{notification.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notification.date).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
