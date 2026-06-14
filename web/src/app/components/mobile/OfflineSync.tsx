import React from "react";
import { Link } from "react-router";
import { WifiOff, RefreshCw, CheckCircle, Clock } from "lucide-react";
import { offlineQueue } from "../../lib/mockData";

export function OfflineSync() {
  const [isOnline, setIsOnline] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setIsOnline(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white p-4">
          <div className="flex items-center gap-3">
            <WifiOff className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Đang mất kết nối</p>
              <p className="text-sm text-yellow-100">
                Dữ liệu đang được lưu tạm, sẽ tự động gửi khi có mạng
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Online Banner */}
      {isOnline && (
        <div className="bg-green-600 text-white p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Đã kết nối lại</p>
              <p className="text-sm text-green-100">
                Tất cả dữ liệu đã được đồng bộ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Đồng bộ dữ liệu</h2>
          <p className="text-gray-600">Quản lý dữ liệu chưa gửi</p>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={syncing || isOnline}
          className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
            syncing
              ? "bg-gray-400 text-white cursor-not-allowed"
              : isOnline
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <RefreshCw className={`w-5 h-5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Đang đồng bộ..." : isOnline ? "Đã đồng bộ" : "Đồng bộ ngay"}
        </button>

        {/* Offline Queue */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-900">
              Dữ liệu chưa gửi ({offlineQueue.filter(q => !q.synced).length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {offlineQueue.length > 0 ? (
              offlineQueue.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {item.synced ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {new Date(item.date).toLocaleString("vi-VN")}
                      </p>
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.synced
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {item.synced ? "Đã đồng bộ" : "Chờ đồng bộ"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Không có dữ liệu chờ đồng bộ</p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Lưu ý</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Dữ liệu sẽ tự động được lưu khi mất kết nối</li>
            <li>• Hệ thống sẽ tự động đồng bộ khi có mạng trở lại</li>
            <li>• Bạn cũng có thể đồng bộ thủ công bất kỳ lúc nào</li>
          </ul>
        </div>

        {/* Back Button */}
        <Link to="/mobile/tasks" className="block">
          <button className="w-full bg-gray-200 text-gray-900 py-4 rounded-xl font-bold hover:bg-gray-300 transition-colors">
            Quay lại
          </button>
        </Link>
      </div>
    </div>
  );
}
