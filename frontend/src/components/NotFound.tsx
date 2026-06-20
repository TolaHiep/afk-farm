import { Link, useRouteError, isRouteErrorResponse } from "react-router";
import { AlertTriangle, Home } from "lucide-react";

// Trang fallback hiển thị khi URL sai hoặc render trang lỗi (errorElement).
// Thay UI default cua React Router ("Hey developer 👋").
export function NotFound() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : null;
  const isNotFound = status === 404 || !error;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <AlertTriangle className="w-9 h-9 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isNotFound ? "Không tìm thấy trang" : "Có lỗi xảy ra"}
        </h1>
        <p className="text-gray-600 mb-6">
          {isNotFound
            ? "Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển."
            : "Hệ thống gặp lỗi không mong muốn. Vui lòng tải lại trang."}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link to="/admin/dashboard" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
            <Home className="w-4 h-4" /> Về trang chủ Admin
          </Link>
          <Link to="/mobile/tasks" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
            Về trang Mobile
          </Link>
        </div>
      </div>
    </div>
  );
}
