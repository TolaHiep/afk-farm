import React from "react";
import { Link, useNavigate } from "react-router";
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Trash2,
  PauseCircle,
  Layers,
} from "lucide-react";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/StatusBadge";
import {
  zones as zonesData,
  plots as plotsData,
  type CropOnPlot,
} from "../../lib/mockData";

// Kiểu trạng thái chi tiết của lô/vùng
type PlotStatus = "good" | "warning" | "danger" | "pending" | "done" | "inactive";

// Map trạng thái -> nhãn tiếng Việt + màu badge tương thích StatusBadge
const STATUS_META: Record<PlotStatus, { label: string; badge: "good" | "warning" | "danger" | "pending" | "completed" | "resolved" }> = {
  good: { label: "Đang hoạt động", badge: "good" },
  warning: { label: "Cảnh báo", badge: "warning" },
  danger: { label: "Khẩn cấp", badge: "danger" },
  pending: { label: "Chưa xử lý", badge: "pending" },
  done: { label: "Đã hoàn thành", badge: "completed" },
  inactive: { label: "Nghỉ / Không hoạt động", badge: "resolved" },
};

// Màu thanh tiến độ theo trạng thái
const PROGRESS_COLOR: Record<PlotStatus, string> = {
  good: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
  pending: "bg-gray-400",
  done: "bg-green-500",
  inactive: "bg-gray-300",
};

interface PlotItem {
  id: string;
  name: string;
  zoneId: string;
  area: number;
  teamLeader: string;
  teamLeaderId: string;
  crop: string;
  status: string;
  done: number;
  total: number;
  // Mô hình xen canh: từng cây (Gấc tầng trên + Sâm tầng dưới) có tiến độ/trạng thái riêng
  crops: CropOnPlot[];
}

interface ZoneItem {
  id: string;
  name: string;
  area: number;
  plots: number;
  status: string;
}

type ConfirmTarget =
  | { kind: "zone"; id: string; name: string }
  | { kind: "plot"; id: string; name: string; suggestDeactivate: boolean };

export function ZoneManagement() {
  const navigate = useNavigate();

  // State cục bộ (prototype) cho phép xóa / ngưng hoạt động
  const [zones, setZones] = React.useState<ZoneItem[]>(() =>
    zonesData.map((z) => ({ ...z }))
  );
  const [plots, setPlots] = React.useState<PlotItem[]>(() =>
    plotsData.map((p) => ({ ...p }))
  );

  const [expandedZones, setExpandedZones] = React.useState<Set<string>>(
    new Set(["z1"])
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [confirm, setConfirm] = React.useState<ConfirmTarget | null>(null);

  const toggleZone = (zoneId: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  };

  const normalize = (s: string) => s.toLowerCase().trim();
  const term = normalize(searchTerm);

  const plotMatches = (p: PlotItem) => {
    // Khớp nếu trạng thái gộp hoặc BẤT KỲ cây nào trong lô có trạng thái khớp
    const byStatus =
      statusFilter === "all" ||
      p.status === statusFilter ||
      p.crops.some((c) => c.status === statusFilter);
    const byTerm =
      !term ||
      normalize(p.name).includes(term) ||
      normalize(p.crop).includes(term) ||
      normalize(p.teamLeader).includes(term);
    return byStatus && byTerm;
  };

  // Điều hướng tới lịch công việc khi bấm vào tên lô hoặc tiến độ
  const goToPlot = (plotId: string) => {
    navigate(`/admin/calendar?plot=${plotId}`);
  };

  // Yêu cầu xác nhận xóa vùng
  const askDeleteZone = (z: ZoneItem) =>
    setConfirm({ kind: "zone", id: z.id, name: z.name });

  // Yêu cầu xác nhận xóa lô (đề xuất ngưng hoạt động nếu đã có tiến độ)
  const askDeletePlot = (p: PlotItem) =>
    setConfirm({
      kind: "plot",
      id: p.id,
      name: p.name,
      suggestDeactivate: p.done > 0 || p.total > 0,
    });

  const closeConfirm = () => setConfirm(null);

  const doDeleteZone = (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    setPlots((prev) => prev.filter((p) => p.zoneId !== zoneId));
    closeConfirm();
  };

  const doDeletePlot = (plotId: string) => {
    setPlots((prev) => prev.filter((p) => p.id !== plotId));
    closeConfirm();
  };

  const doDeactivatePlot = (plotId: string) => {
    setPlots((prev) =>
      prev.map((p) => (p.id === plotId ? { ...p, status: "inactive" } : p))
    );
    closeConfirm();
  };

  const statusMeta = (status: string) =>
    STATUS_META[(status as PlotStatus)] ?? STATUS_META.pending;

  return (
    <div className="space-y-6">
      {/* Header / Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm lô, cây trồng, tổ trưởng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="good">Đang hoạt động</option>
            <option value="warning">Cảnh báo</option>
            <option value="danger">Khẩn cấp</option>
            <option value="pending">Chưa xử lý</option>
            <option value="done">Đã hoàn thành</option>
            <option value="inactive">Nghỉ / Không hoạt động</option>
          </select>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/zones/add?type=zone">
            <Button variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              Thêm vùng
            </Button>
          </Link>
          <Link to="/admin/zones/add?type=plot">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Thêm lô
            </Button>
          </Link>
        </div>
      </div>

      {/* Cây Vùng & Lô (accordion theo zone) */}
      <div className="space-y-4">
        {zones.length === 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-10 text-center text-gray-400">
            Không còn vùng nào.
          </div>
        )}

        {zones.map((zone) => {
          const zonePlots = plots.filter((p) => p.zoneId === zone.id);
          const visiblePlots = zonePlots.filter(plotMatches);

          // Khi có bộ lọc/từ khóa, ẩn zone không có lô khớp
          const filtering = term !== "" || statusFilter !== "all";
          if (filtering && visiblePlots.length === 0) return null;

          const isExpanded = expandedZones.has(zone.id) || filtering;
          const zoneMeta = statusMeta(zone.status);

          return (
            <div
              key={zone.id}
              className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
            >
              {/* Zone header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
                <button
                  onClick={() => toggleZone(zone.id)}
                  className="flex items-center gap-2 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <Layers className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-900">{zone.name}</span>
                  <span className="text-sm text-gray-500">
                    · {zone.area.toLocaleString()} m² · {zonePlots.length} lô
                  </span>
                  <StatusBadge status={zoneMeta.badge}>{zoneMeta.label}</StatusBadge>
                </button>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/admin/zones/add?type=plot&zone=${zone.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm lô
                  </Link>
                  <button
                    onClick={() => askDeleteZone(zone)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa vùng
                  </button>
                </div>
              </div>

              {/* Plot list */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lô</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại cây</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổ trưởng</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiến độ</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {visiblePlots.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-400">
                            Chưa có lô nào trong vùng này.
                          </td>
                        </tr>
                      )}
                      {visiblePlots.map((plot) => {
                        // Danh sách cây xen canh trên lô (Gấc tầng trên + Sâm tầng dưới)
                        const cropList =
                          plot.crops.length > 0
                            ? plot.crops
                            : [
                                {
                                  crop: plot.crop,
                                  done: plot.done,
                                  total: plot.total,
                                  status: plot.status,
                                },
                              ];

                        return (
                          <tr key={plot.id} className="hover:bg-gray-50">
                            {/* Tên lô -> điều hướng */}
                            <td className="px-5 py-4">
                              <button
                                onClick={() => goToPlot(plot.id)}
                                className="font-medium text-green-700 hover:underline text-left"
                              >
                                {plot.name}
                              </button>
                              <div className="text-xs text-gray-400">
                                {plot.area.toLocaleString()} m²
                              </div>
                            </td>
                            {/* Loại cây: liệt kê từng cây xen canh dạng chip */}
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {cropList.map((c, i) => (
                                  <span
                                    key={`${plot.id}-crop-${i}`}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                                  >
                                    {c.crop}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-700">{plot.teamLeader}</td>
                            {/* Trạng thái: 1 badge cho mỗi cây (kèm nhãn cây) */}
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-1.5">
                                {cropList.map((c, i) => {
                                  const cMeta = statusMeta(c.status);
                                  return (
                                    <div
                                      key={`${plot.id}-status-${i}`}
                                      className="flex items-center gap-1.5"
                                    >
                                      <span className="text-xs text-gray-500 w-9 shrink-0">
                                        {c.crop}
                                      </span>
                                      <StatusBadge status={cMeta.badge}>
                                        {cMeta.label}
                                      </StatusBadge>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            {/* Tiến độ: 1 thanh nhỏ cho mỗi cây -> điều hướng */}
                            <td className="px-5 py-4">
                              <button
                                onClick={() => goToPlot(plot.id)}
                                className="w-44 text-left group space-y-2"
                                title="Xem lịch công việc"
                              >
                                {cropList.map((c, i) => {
                                  const cPct =
                                    c.total > 0
                                      ? Math.min(
                                          100,
                                          Math.round((c.done / c.total) * 100)
                                        )
                                      : 0;
                                  const cBarColor =
                                    PROGRESS_COLOR[(c.status as PlotStatus)] ??
                                    PROGRESS_COLOR.pending;
                                  return (
                                    <div key={`${plot.id}-prog-${i}`}>
                                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                        <span className="group-hover:text-green-700">
                                          {c.crop}: {c.done}/{c.total}
                                        </span>
                                        <span className="text-gray-400">{cPct}%</span>
                                      </div>
                                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${cBarColor}`}
                                          style={{ width: `${cPct}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </button>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Link to={`/admin/zones/edit/${plot.id}`}>
                                  <Button variant="ghost" size="sm">Sửa</Button>
                                </Link>
                                <button
                                  onClick={() => askDeletePlot(plot)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal xác nhận xóa */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md p-6">
            {confirm.kind === "zone" ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Xóa vùng "{confirm.name}"?
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Bạn có chắc chắn muốn xóa vùng này không? Tất cả các lô bên trong
                  cũng sẽ bị xóa. Dữ liệu liên quan có thể bị ảnh hưởng.
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={closeConfirm}>Hủy</Button>
                  <Button variant="danger" onClick={() => doDeleteZone(confirm.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa vùng
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Xóa lô "{confirm.name}"?
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Bạn có chắc chắn muốn xóa lô này không? Dữ liệu liên quan có thể
                  bị ảnh hưởng.
                </p>
                {confirm.suggestDeactivate && (
                  <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    Lô này đã có công việc/tiến độ. Khuyến nghị "Ngưng hoạt động"
                    thay vì xóa cứng để giữ lại dữ liệu lịch sử.
                  </p>
                )}
                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="secondary" onClick={closeConfirm}>Hủy</Button>
                  {confirm.suggestDeactivate && (
                    <Button variant="primary" onClick={() => doDeactivatePlot(confirm.id)}>
                      <PauseCircle className="w-4 h-4 mr-2" />
                      Ngưng hoạt động
                    </Button>
                  )}
                  <Button variant="danger" onClick={() => doDeletePlot(confirm.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa lô
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
