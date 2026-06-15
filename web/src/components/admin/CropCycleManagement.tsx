import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Calendar, FileText, X, AlertTriangle, MapPin, Edit2, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/StatusBadge";
import { Modal, Field, FormActions, ConfirmDialog, inputCls } from "../ui/FormModal";
import {
  cropCycles as cycleSeed,
  plots,
  processes,
  teamLeaderReports,
  plotName,
  zoneName,
  plotCrops,
} from "../../lib/mockData";

interface Cycle { id: string; plotId: string; crop: string; startDate: string; processId: string; status: string; }

const CYCLE_STATUS: Record<string, { label: string; badge: "active" | "pending" | "completed" }> = {
  active: { label: "Đang hoạt động", badge: "active" },
  paused: { label: "Tạm dừng", badge: "pending" },
  done: { label: "Kết thúc", badge: "completed" },
};
const emptyCycle = (): Cycle => ({ id: "", plotId: plots[0]?.id ?? "", crop: "Gấc", startDate: "2026-06-14", processId: processes[0]?.id ?? "", status: "active" });

export function CropCycleManagement() {
  const navigate = useNavigate();
  // Lô đang được mở để xem báo cáo tổ trưởng (null = không mở panel nào)
  const [reportPlotId, setReportPlotId] = useState<string | null>(null);

  // State CRUD chu kỳ (prototype)
  const [cycles, setCycles] = useState<Cycle[]>(() => cycleSeed.map((c) => ({ ...c })));
  const [cycleModal, setCycleModal] = useState<{ mode: "add" | "edit"; data: Cycle } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const seq = React.useRef(100);

  const saveCycle = (data: Cycle) => {
    if (!data.plotId) return;
    setCycles((prev) =>
      data.id ? prev.map((c) => (c.id === data.id ? data : c)) : [...prev, { ...data, id: `cc${++seq.current}` }]
    );
    setCycleModal(null);
  };
  const deleteCycle = (id: string) => {
    setCycles((prev) => prev.filter((c) => c.id !== id));
    setConfirmId(null);
  };

  // Khi bấm vào tên Lô: điều hướng tới trang quản lý vùng để xem chi tiết lô.
  // Truyền plotId qua query để trang /admin/zones có thể mở/scroll đúng vị trí lô tương ứng.
  const goToPlot = (plotId: string) => {
    navigate(`/admin/zones?plot=${plotId}`);
  };

  // Nhóm các chu kỳ theo LÔ để thể hiện mô hình xen canh 2 tầng (Gấc + Sâm) trên cùng lô.
  // Giữ thứ tự lô theo danh sách plots, và xếp Gấc trước Sâm trong mỗi lô.
  const cropOrder = (crop: string) => (crop === "Gấc" ? 0 : crop === "Sâm" ? 1 : 2);
  const groupedPlots = plots
    .map((plot) => ({
      plot,
      cycles: cycles
        .filter((c) => c.plotId === plot.id)
        .sort((a, b) => cropOrder(a.crop) - cropOrder(b.crop)),
    }))
    .filter((g) => g.cycles.length > 0);
  // Chu kỳ thuộc lô không còn trong danh sách plots (phòng trường hợp dữ liệu lệch)
  const orphanCycles = cycles.filter((c) => !plots.some((p) => p.id === c.plotId));

  // Tiến độ 1 chu kỳ con: ưu tiên lấy theo cây tương ứng trong plot.crops (done/total).
  // Nếu không tìm thấy cây khớp thì rơi về cách tính cũ theo số ngày đã trôi (giả định chu kỳ 90 ngày).
  const cycleProgress = (cycle: Cycle): number => {
    const match = plotCrops(cycle.plotId).find((c) => c.crop === cycle.crop);
    if (match && match.total > 0) {
      return Math.min(Math.round((match.done / match.total) * 100), 100);
    }
    const startDate = new Date(cycle.startDate);
    const today = new Date("2026-06-14");
    const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(Math.round((daysElapsed / 90) * 100), 0), 100);
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
        <Button variant="primary" onClick={() => setCycleModal({ mode: "add", data: emptyCycle() })}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm chu kỳ mới
        </Button>
      </div>

      {/* Crop Cycles Table — nhóm theo LÔ, mỗi lô gồm 2 tầng cây (Gấc giàn trên + Sâm dưới tán) */}
      {/* Bảng: chỉ hiển thị từ md trở lên để tránh tràn ngang trên điện thoại */}
      <div className="hidden md:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tầng cây</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày bắt đầu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quy trình</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiến độ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {groupedPlots.map(({ plot, cycles: plotCycles }) => {
                const reportCount = teamLeaderReports.filter((r) => r.plotId === plot.id).length;
                return (
                  <React.Fragment key={plot.id}>
                    {/* Dòng tiêu đề LÔ: tên lô + vùng + diện tích + tổ trưởng */}
                    <tr className="bg-green-50/70 border-t-4 border-green-100">
                      <td colSpan={6} className="px-6 py-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <button
                            type="button"
                            onClick={() => goToPlot(plot.id)}
                            className="text-green-800 hover:text-green-900 hover:underline font-semibold"
                            title="Xem chi tiết lô tại trang quản lý vùng"
                          >
                            {plot.name}
                          </button>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3.5 h-3.5" />
                            {zoneName(plot.zoneId)}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-500">{(plot.area / 10000).toFixed(1)} ha</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-500">Tổ trưởng: {plot.teamLeader || "—"}</span>
                          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5">
                            Xen canh {plotCycles.length} tầng
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Các chu kỳ con của lô (Gấc, Sâm) */}
                    {plotCycles.map((cycle) => {
                      const process = processes.find((p) => p.id === cycle.processId);
                      const cycleStatus = CYCLE_STATUS[cycle.status] ?? CYCLE_STATUS.active;
                      const progress = cycleProgress(cycle);
                      const isGac = cycle.crop === "Gấc";
                      return (
                        <tr key={cycle.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm">
                            <div className="flex items-center gap-2 pl-3">
                              <span
                                className={`inline-block w-1.5 h-6 rounded-full ${isGac ? "bg-emerald-500" : "bg-amber-500"}`}
                              ></span>
                              <div>
                                <div className="font-medium text-gray-900">{cycle.crop}</div>
                                <div className="text-xs text-gray-400">
                                  {isGac ? "Giàn trên" : "Dưới tán"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(cycle.startDate).toLocaleDateString("vi-VN")}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">{process?.name}</td>
                          <td className="px-6 py-3">
                            <StatusBadge status={cycleStatus.badge}>{cycleStatus.label}</StatusBadge>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2 min-w-[140px]">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isGac ? "bg-emerald-600" : "bg-amber-500"}`}
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600 w-12 text-right">{progress}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
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
                              <Button variant="ghost" size="sm" onClick={() => setCycleModal({ mode: "edit", data: { ...cycle } })} title="Sửa chu kỳ">
                                <Edit2 className="w-4 h-4 mr-1" /> Sửa
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setConfirmId(cycle.id)} title="Xóa chu kỳ">
                                <Trash2 className="w-4 h-4 mr-1 text-red-600" /> <span className="text-red-600">Xóa</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Chu kỳ thuộc lô không xác định (nếu có) */}
              {orphanCycles.map((cycle) => {
                const process = processes.find((p) => p.id === cycle.processId);
                const cycleStatus = CYCLE_STATUS[cycle.status] ?? CYCLE_STATUS.active;
                const progress = cycleProgress(cycle);
                return (
                  <tr key={cycle.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm">
                      <div className="font-medium text-gray-900">{cycle.crop}</div>
                      <div className="text-xs text-gray-400">{plotName(cycle.plotId)}</div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(cycle.startDate).toLocaleDateString("vi-VN")}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{process?.name}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={cycleStatus.badge}>{cycleStatus.label}</StatusBadge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-600 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setCycleModal({ mode: "edit", data: { ...cycle } })} title="Sửa chu kỳ">
                          <Edit2 className="w-4 h-4 mr-1" /> Sửa
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(cycle.id)} title="Xóa chu kỳ">
                          <Trash2 className="w-4 h-4 mr-1 text-red-600" /> <span className="text-red-600">Xóa</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dạng THẺ cho điện thoại — chỉ hiển thị dưới md, nhóm theo LÔ, không tràn ngang */}
      <div className="md:hidden space-y-4">
        {groupedPlots.map(({ plot, cycles: plotCycles }) => {
          const reportCount = teamLeaderReports.filter((r) => r.plotId === plot.id).length;
          return (
            <div
              key={plot.id}
              className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
            >
              {/* Header lô: tên + vùng + diện tích + tổ trưởng + badge xen canh */}
              <div className="bg-green-50/70 border-l-4 border-green-400 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => goToPlot(plot.id)}
                    className="text-green-800 hover:text-green-900 hover:underline font-semibold text-left"
                    title="Xem chi tiết lô tại trang quản lý vùng"
                  >
                    {plot.name}
                  </button>
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5">
                    Xen canh {plotCycles.length} tầng
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {zoneName(plot.zoneId)}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>{(plot.area / 10000).toFixed(1)} ha</span>
                  <span className="text-gray-300">·</span>
                  <span>Tổ trưởng: {plot.teamLeader || "—"}</span>
                </div>
              </div>

              {/* Các chu kỳ con (Gấc / Sâm) xếp dọc */}
              <div className="p-3 space-y-3">
                {plotCycles.map((cycle) => {
                  const process = processes.find((p) => p.id === cycle.processId);
                  const cycleStatus = CYCLE_STATUS[cycle.status] ?? CYCLE_STATUS.active;
                  const progress = cycleProgress(cycle);
                  const isGac = cycle.crop === "Gấc";
                  return (
                    <div
                      key={cycle.id}
                      className="border border-gray-200 rounded-lg p-3 space-y-3"
                    >
                      {/* Tầng cây + trạng thái */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block w-1.5 h-8 rounded-full ${isGac ? "bg-emerald-500" : "bg-amber-500"}`}
                          ></span>
                          <div>
                            <div className="font-medium text-gray-900">{cycle.crop}</div>
                            <div className="text-xs text-gray-400">
                              {isGac ? "Giàn trên" : "Dưới tán"}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={cycleStatus.badge}>{cycleStatus.label}</StatusBadge>
                      </div>

                      {/* Ngày bắt đầu */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Bắt đầu:</span>
                        {new Date(cycle.startDate).toLocaleDateString("vi-VN")}
                      </div>

                      {/* Quy trình */}
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-500">Quy trình: </span>
                        {process?.name}
                      </div>

                      {/* Thanh tiến độ */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isGac ? "bg-emerald-600" : "bg-amber-500"}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{progress}%</span>
                      </div>

                      {/* Thao tác: Báo cáo / Sửa / Xóa */}
                      <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-gray-100">
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
                        <Button variant="ghost" size="sm" onClick={() => setCycleModal({ mode: "edit", data: { ...cycle } })} title="Sửa chu kỳ">
                          <Edit2 className="w-4 h-4 mr-1" /> Sửa
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(cycle.id)} title="Xóa chu kỳ">
                          <Trash2 className="w-4 h-4 mr-1 text-red-600" /> <span className="text-red-600">Xóa</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Chu kỳ thuộc lô không xác định (nếu có) */}
        {orphanCycles.length > 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-3 space-y-3">
            {orphanCycles.map((cycle) => {
              const process = processes.find((p) => p.id === cycle.processId);
              const cycleStatus = CYCLE_STATUS[cycle.status] ?? CYCLE_STATUS.active;
              const progress = cycleProgress(cycle);
              return (
                <div key={cycle.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-gray-900">{cycle.crop}</div>
                      <div className="text-xs text-gray-400">{plotName(cycle.plotId)}</div>
                    </div>
                    <StatusBadge status={cycleStatus.badge}>{cycleStatus.label}</StatusBadge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Bắt đầu:</span>
                    {new Date(cycle.startDate).toLocaleDateString("vi-VN")}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="text-gray-500">Quy trình: </span>
                    {process?.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-600 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{progress}%</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-gray-100">
                    <Button variant="ghost" size="sm" onClick={() => setCycleModal({ mode: "edit", data: { ...cycle } })} title="Sửa chu kỳ">
                      <Edit2 className="w-4 h-4 mr-1" /> Sửa
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(cycle.id)} title="Xóa chu kỳ">
                      <Trash2 className="w-4 h-4 mr-1 text-red-600" /> <span className="text-red-600">Xóa</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Lưu ý — Mô hình xen canh 2 tầng</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Mỗi lô canh tác đồng thời <strong>2 tầng cây trên cùng diện tích</strong>: Gấc leo giàn (tầng trên) và Sâm dưới tán (tầng dưới) — tương ứng 2 chu kỳ song song.</li>
          <li>• Mỗi tầng cây có <strong>quy trình và lịch công việc riêng</strong> (Quy trình Gấc / Quy trình Sâm); hệ thống tự động sinh công việc theo quy trình đã chọn.</li>
          <li>• Tiến độ mỗi tầng được tính theo số việc đã hoàn thành của cây tương ứng trên lô.</li>
          <li>• Có thể tạm dừng hoặc kết thúc sớm từng tầng độc lập mà không ảnh hưởng tầng còn lại.</li>
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

      {/* Modal thêm/sửa chu kỳ */}
      {cycleModal && (
        <CycleForm modal={cycleModal} onClose={() => setCycleModal(null)} onSave={saveCycle} />
      )}

      {/* Xác nhận xóa chu kỳ */}
      {confirmId && (
        <ConfirmDialog
          title="Xóa chu kỳ cây trồng?"
          message="Bạn có chắc muốn xóa chu kỳ này? Công việc đã sinh từ chu kỳ có thể bị ảnh hưởng."
          onCancel={() => setConfirmId(null)}
          onConfirm={() => deleteCycle(confirmId)}
        />
      )}
    </div>
  );
}

function CycleForm({ modal, onClose, onSave }: { modal: { mode: "add" | "edit"; data: Cycle }; onClose: () => void; onSave: (d: Cycle) => void; }) {
  const [form, setForm] = React.useState<Cycle>(modal.data);
  return (
    <Modal title={modal.mode === "add" ? "Thêm chu kỳ cây trồng" : "Sửa chu kỳ cây trồng"} onClose={onClose}>
      <Field label="Lô *">
        <select value={form.plotId} onChange={(e) => setForm({ ...form, plotId: e.target.value })} className={inputCls}>
          {plots.map((p) => <option key={p.id} value={p.id}>{zoneName(p.zoneId)} · {p.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Loại cây">
          <select value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })} className={inputCls}>
            <option value="Gấc">Gấc</option>
            <option value="Sâm">Sâm</option>
          </select>
        </Field>
        <Field label="Ngày bắt đầu">
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <Field label="Quy trình">
        <select value={form.processId} onChange={(e) => setForm({ ...form, processId: e.target.value })} className={inputCls}>
          {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Trạng thái">
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
          <option value="active">Đang hoạt động</option>
          <option value="paused">Tạm dừng</option>
          <option value="done">Kết thúc</option>
        </select>
      </Field>
      <FormActions onClose={onClose} onSave={() => onSave(form)} disabled={!form.plotId} />
    </Modal>
  );
}
