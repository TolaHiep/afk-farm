import React from "react";
import { Link } from "react-router";
import { CheckCircle } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

export function ReportSuccess() {
  // Mốc thời gian thực khi render trang (sau khi gửi báo cáo thành công)
  const [sentAt] = React.useState(() => new Date());
  const dateStr = `${pad(sentAt.getDate())}/${pad(sentAt.getMonth() + 1)}/${sentAt.getFullYear()}`;
  const timeStr = `${pad(sentAt.getHours())}:${pad(sentAt.getMinutes())}`;

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Gửi thành công.
          </h1>
          <p className="text-gray-600">
            Báo cáo cuối ngày của bạn đã được ghi nhận
          </p>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-2">Tóm tắt báo cáo</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Ngày:</span>
              <span className="font-medium text-gray-900">{dateStr}</span>
            </div>
            <div className="flex justify-between">
              <span>Thời gian gửi:</span>
              <span className="font-medium text-gray-900">{timeStr}</span>
            </div>
            <div className="flex justify-between">
              <span>Trạng thái:</span>
              <span className="font-medium text-green-600">Đã ghi nhận</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link to="/mobile/tasks" className="block">
            <button className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors">
              Về trang chủ
            </button>
          </Link>
          <Link to="/mobile/report" className="block">
            <button className="w-full bg-gray-200 text-gray-900 py-4 rounded-xl text-lg font-bold hover:bg-gray-300 transition-colors">
              Gửi báo cáo khác
            </button>
          </Link>
        </div>

        {/* Info */}
        <p className="text-sm text-gray-500 mt-6">
          Cảm ơn bạn đã hoàn thành công việc hôm nay.
        </p>
      </div>
    </div>
  );
}
