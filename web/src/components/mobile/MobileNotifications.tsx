import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { Bell, Calendar, UserCircle, CheckCircle, Circle } from "lucide-react";
import { getMobileNotifications } from "../../lib/queries";

export function MobileNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMobileNotifications()
      .then((data) => {
        setNotifications(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load notifications:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Đang tải…</div>;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "new-task": return <Bell className="w-5 h-5 text-blue-600" />;
      case "rescheduled": return <Calendar className="w-5 h-5 text-yellow-600" />;
      case "reassigned": return <UserCircle className="w-5 h-5 text-purple-600" />;
      case "report-success": return <CheckCircle className="w-5 h-5 text-green-600" />;
      default: return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Thông báo</h2>
        <button className="text-sm text-green-600 font-semibold">
          Đánh dấu đã đọc
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button className="flex-1 py-3 font-semibold text-green-600 border-b-2 border-green-600">
            Tất cả
          </button>
          <button className="flex-1 py-3 font-semibold text-gray-600">
            Chưa đọc
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white rounded-lg shadow border border-gray-200 p-4 ${
              !notification.read ? "border-l-4 border-l-green-600" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">
                    {notification.title}
                  </h3>
                  {!notification.read && (
                    <span className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full"></span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {notification.description}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(notification.date).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900 mb-1">
            Không có thông báo
          </p>
          <p className="text-gray-600">
            Bạn sẽ nhận được thông báo tại đây
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-3">Thao tác nhanh</h4>
        <div className="space-y-2">
          <Link to="/mobile/tasks" className="block">
            <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
              Xem công việc hôm nay
            </button>
          </Link>
          <Link to="/mobile/upcoming" className="block">
            <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
              Xem công việc sắp tới
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
