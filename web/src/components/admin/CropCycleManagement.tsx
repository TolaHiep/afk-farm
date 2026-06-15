import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Calendar, FileText, X, AlertTriangle, MapPin } from "lucide-react";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/StatusBadge";
import {
  cropCycles,
  plots,
  processes,
  teamLeaderReports,
  plotName,
  zoneName,
} from "../../lib/mockData";

export function CropCycleManagement() {
  const navigate = useNavigate();
  // Lô đang được mở để xem báo cáo tổ trưởng (null = không mở panel nào)
  const [reportPlotId, setReportPlotId] = useState<string | null>(null);

  // Khi bấm vào tên Lô: điều hướng tới trang quản lý vùng để xem chi tiết lô.
  // Truyền plotId qua query để trang /admin/zones có thể mở/scroll đúng vị trí lô tương ứng.
  const goToPlot = (plotId: string) => {
    navigate(`/admin/zones?plot=${plotId}`);
  };

  // Lô đang xem báo cáo + danh sách báo cáo của lô đó
  const reportPlot = reportPlotId ? plots.find((p) => p.id === reportPlotId) : null;
  const plotReports = reportPlotId
    ? teamLeaderReports.filter((r) => r.plotId === reportPlotId)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý chu kỳ cây trồng</h2>
          <p className="text-gray-600 mt-1">Khai báo và theo dõi chu kỳ canh tác của từng lô</p>
        </div>
        <Button variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Thêm chu kỳ mới
        </Button>
      </div>

      {/* Crop Cycles Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lô</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cây trồng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diện tích</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổ trưởng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày bắt đầu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quy trình</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiến độ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cropCycles.map((cycle) => {
                const plot = plots.find((p) => p.id === cycle.plotId);
                const process = processes.find((p) => p.id === cycle.processId);
                const startDate = new Date(cycle.startDate);
                const today = new Date("2026-06-14");
                const daysElapsed = Math.floor(
                  (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                const progress = Math.min(Math.round((daysElapsed / 90) * 100), 100);
                const reportCount = teamLeaderReports.filter(
                  (r) => r.plotId === cycle.plotId
                ).length;

                return (
                  <tr key={cycle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">
                      {/* Bấm vào tên Lô để xem chi tiết lô tại trang quản lý vùng */}
                      <button
                        type="button"
                        onClick={() => goToPlot(cycle.plotId)}
                        className="text-green-700 hover:text-green-800 hover:underline font-medium"
                        title="Xem chi tiết lô tại trang quản lý vùng"
                      >
                        {plot?.name || plotName(cycle.plotId)}
                      </button>
                      {plot && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {zoneName(plot.zoneId)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{cycle.crop}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {plot ? `${(plot.area / 10000).toFixed(1)} ha` : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {plot?.teamLeader || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(cycle.startDate).toLocaleDateString("vi-VN")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{process?.name}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status="active">Đang hoạt động</StatusBadge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-600 rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReportPlotId(cycle.plotId)}
                          title="Xem báo cáo tổ trưởng của lô này"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Báo cáo
                          {reportCount > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center px-1.5 h-5 min-w-[20px] rounded-full bg-green-100 text-green-800 text-xs font-medium">
                              {reportCount}
                            </span>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm">Chi tiết</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Lưu ý</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Một lô có thể có nhiều chu kỳ cây trồng song song (ví dụ: cả Gấc và Sâm)</li>
          <li>• Hệ thống sẽ tự động sinh công việc theo quy trình đã chọn</li>
          <li>• Chu kỳ có thể được tạm dừng hoặc kết thúc sớm nếu cần</li>
        </ul>
      </div>

      {/* Modal: Báo cáo tổ trưởng theo lô */}
      {reportPlotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setReportPlotId(null)}
          ></div>

          {/* Panel */}
          <div className="relative bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Báo cáo tổ trưởng — {reportPlot?.name || plotName(reportPlotId)}
                </h3>
                {reportPlot && (
                  <button
                    type="button"
                    onClick={() => goToPlot(reportPlotId)}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 hover:underline"
                    title="Xem chi tiết lô tại trang quản lý vùng"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {zoneName(reportPlot.zoneId)} · {reportPlot.teamLeader} ·{" "}
                    {(reportPlot.area / 10000).toFixed(1)} ha
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setReportPlotId(null)}
                className="text-gray-400 hover:text-gray-600 p-1 -mr-1"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto space-y-4">
              {plotReports.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Chưa có báo cáo cho lô này
                </p>
              ) : (
                plotReports.map((report) => (
                  <div
                    key={report.id}
                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    {/* Dòng đầu: ngày, tổ trưởng, cây, cờ bất thường */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {new Date(report.date).toLocaleDateString("vi-VN")}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="font-medium text-gray-900">{report.reporter}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-600">{report.crop}</span>
                      </div>
                      {report.abnormal ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Bất thường
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Bình thường
                        </span>
                      )}
                    </div>

                    {/* Nội dung */}
                    <p className="text-sm text-gray-700">{report.content}</p>

                    {/* Ảnh (thumbnail) */}
                    {report.photos && report.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {report.photos.map((photo, idx) => (
                          <a
                            key={idx}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={photo}
                              alt={`Ảnh báo cáo ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded-md border border-gray-200 hover:opacity-90"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Phản hồi admin */}
                    {report.reply ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-xs font-medium text-blue-900 mb-1">Phản hồi của quản trị</p>
                        <p className="text-sm text-blue-800">{report.reply}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Chưa có phản hồi</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setReportPlotId(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
