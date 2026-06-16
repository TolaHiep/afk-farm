import React from "react";
import { Link } from "react-router";
import { WifiOff, RefreshCw, CheckCircle, Clock, Wifi } from "lucide-react";
import { listOffline, replayOffline, type OfflineItem } from "../../lib/offline";

const KIND_LABEL: Record<string, string> = {
  report: "Báo cáo cuối ngày",
  support: "Yêu cầu hỗ trợ",
  task: "Hoàn thành công việc",
};

export function OfflineSync() {
  const [isOnline, setIsOnline] = React.useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [syncing, setSyncing] = React.useState(false);
  const [queue, setQueue] = React.useState<OfflineItem[]>(() => listOffline());
  const [lastResult, setLastResult] = React.useState<string | null>(null);

  // Trạng thái mạng thật của thiết bị
  React.useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Tự đồng bộ khi vừa có mạng lại và còn dữ liệu chờ
  React.useEffect(() => {
    if (isOnline && listOffline().length > 0 && !syncing) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const handleSync = async () => {
    if (!isOnline) return;
    setSyncing(true);
    setLastResult(null);
    try {
      const { ok, failed } = await replayOffline();
      setQueue(listOffline());
      setLastResult(
        failed > 0
          ? `Đã gửi ${ok} mục, còn ${failed} mục chưa gửi được.`
          : ok > 0
          ? `Đã đồng bộ ${ok} mục.`
          : "Không có dữ liệu chờ đồng bộ."
      );
    } finally {
      setSyncing(false);
    }
  };

  const pending = queue.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner trạng thái mạng */}
      {!isOnline ? (
        <div className="bg-yellow-500 text-white p-4">
          <div className="flex items-center gap-3">
            <WifiOff className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Đang mất kết nối</p>
              <p className="text-sm text-yellow-100">
                Dữ liệu gửi lúc này sẽ được lưu tạm và tự gửi khi có mạng
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-600 text-white p-4">
          <div className="flex items-center gap-3">
            <Wifi className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Đã có kết nối</p>
              <p className="text-sm text-green-100">
                {pending > 0 ? `Còn ${pending} mục chờ đồng bộ` : "Tất cả dữ liệu đã được đồng bộ"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nội dung */}
      <div className="p-4 space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Đồng bộ dữ liệu</h2>
          <p className="text-gray-600">Quản lý dữ liệu chưa gửi</p>
        </div>

        {lastResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            {lastResult}
          </div>
        )}

        {/* Nút đồng bộ */}
        <button
          onClick={handleSync}
          disabled={syncing || !isOnline || pending === 0}
          className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
            syncing
              ? "bg-gray-400 text-white cursor-not-allowed"
              : !isOnline || pending === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <RefreshCw className={`w-5 h-5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Đang đồng bộ..." : pending === 0 ? "Đã đồng bộ" : "Đồng bộ ngay"}
        </button>

        {/* Hàng đợi offline */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-900">Dữ liệu chưa gửi ({pending})</h3>
          </div>

          <div className="divide-y divide-gray-200">
            {pending > 0 ? (
              queue.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-600">
                        {KIND_LABEL[item.kind] || item.kind} ·{" "}
                        {new Date(item.date).toLocaleString("vi-VN")}
                      </p>
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Chờ đồng bộ
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

        {/* Lưu ý */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Lưu ý</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Khi mất mạng, báo cáo/hỗ trợ/hoàn thành việc được lưu tạm trên máy</li>
            <li>• Hệ thống tự động gửi lại khi có mạng trở lại</li>
            <li>• Bạn cũng có thể bấm "Đồng bộ ngay" bất kỳ lúc nào</li>
          </ul>
        </div>

        {/* Quay lại */}
        <Link to="/mobile/tasks" className="block">
          <button className="w-full bg-gray-200 text-gray-900 py-4 rounded-xl font-bold hover:bg-gray-300 transition-colors">
            Quay lại
          </button>
        </Link>
      </div>
    </div>
  );
}
