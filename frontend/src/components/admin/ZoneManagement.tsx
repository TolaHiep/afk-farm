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
  List,
  LayoutGrid,
  Edit2,
} from "lucide-react";
import { Button } from "../ui/button";
import { StatusBadge } from "../ui/StatusBadge";
import { getZones, getPlots, deleteZone, deletePlot, updatePlot } from "../../lib/queries";
import { type CropOnPlot } from "../../lib/mockData";
import { toast } from "../../lib/toast";
import { polygonFromGeoJSON, type LatLng } from "../../lib/geo";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  // Cây đã gắn khi tạo lô (chưa cần chu kỳ) — dùng để hiển thị "Loại cây" trước khi có chu kỳ
  cropTags?: string[];
  boundary?: any;
}

interface ZoneItem {
  id: string;
  name: string;
  area: number;
  plots: number;
  status: string;
  boundary?: any;
}

// Màu fill cho lô trong mini-map (đồng bộ với PROGRESS_COLOR ở dạng hex để vẽ SVG)
const FILL: Record<string, string> = {
  good: "#22c55e", warning: "#eab308", danger: "#ef4444",
  pending: "#9ca3af", done: "#16a34a", inactive: "#d1d5db",
};

// Mini-map Leaflet với ảnh vệ tinh (Esri World_Imagery) cho từng vùng.
// Init khi card hiện trong viewport (IntersectionObserver) để tránh tải đồng loạt khi có nhiều vùng.
function ZoneMiniMap({
  zonePoly, plots, onPlotClick,
}: {
  zonePoly: LatLng[] | null;
  plots: { id: string; name: string; status: string; polygon: LatLng[] }[];
  onPlotClick?: (id: string) => void;
}) {
  const elRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const [visible, setVisible] = React.useState(false);

  // Chỉ tải bản đồ khi card đi vào viewport
  React.useEffect(() => {
    if (!elRef.current || visible) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }),
      { rootMargin: "200px" },
    );
    io.observe(elRef.current);
    return () => io.disconnect();
  }, [visible]);

  React.useEffect(() => {
    if (!visible || !elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { attributionControl: false, zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    // Đảm bảo Leaflet đo lại kích thước sau khi card render
    requestAnimationFrame(() => map.invalidateSize());
    return () => { map.remove(); mapRef.current = null; };
  }, [visible]);

  // Vẽ vùng + lô khi data đổi
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    const all: LatLng[] = [...(zonePoly || []), ...plots.flatMap((p) => p.polygon)];
    if (zonePoly && zonePoly.length >= 3) {
      L.polygon(zonePoly as L.LatLngExpression[], {
        color: "#eab308", weight: 2, dashArray: "5,4", fillColor: "#fef3c7", fillOpacity: 0.15, interactive: false,
      }).addTo(layer);
    }
    plots.forEach((p) => {
      if (p.polygon.length < 3) return;
      const fill = FILL[p.status] || FILL.pending;
      const poly = L.polygon(p.polygon as L.LatLngExpression[], {
        color: fill, weight: 2, fillColor: fill, fillOpacity: 0.45,
      }).addTo(layer);
      poly.bindTooltip(p.name, { permanent: true, direction: "center", className: "akf-plot-label" });
      if (onPlotClick) poly.on("click", () => onPlotClick(p.id));
    });
    if (all.length) map.fitBounds(L.latLngBounds(all as L.LatLngExpression[]), { padding: [12, 12], maxZoom: 19 });
    return () => { layer.remove(); };
  }, [zonePoly, plots, onPlotClick, visible]);

  if (!zonePoly && plots.every((p) => p.polygon.length < 3)) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-gray-400 bg-gray-50">
        Chưa có ranh giới — chỉnh sửa vùng/lô để vẽ trên bản đồ.
      </div>
    );
  }
  return <div ref={elRef} className="w-full h-full bg-gray-100" />;
}

type ConfirmTarget =
  | { kind: "zone"; id: string; name: string }
  | { kind: "plot"; id: string; name: string; suggestDeactivate: boolean };

export function ZoneManagement() {
  const navigate = useNavigate();

  // Dữ liệu nạp từ API backend; xóa/ngưng vẫn là thao tác cục bộ (prototype) cho tới khi có endpoint
  const [zones, setZones] = React.useState<ZoneItem[]>([]);
  const [plots, setPlots] = React.useState<PlotItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");

  React.useEffect(() => {
    Promise.all([getZones(), getPlots()])
      .then(([z, p]) => {
        setZones(z as ZoneItem[]);
        setPlots(p as PlotItem[]);
      })
      .catch(() => setLoadError("Không tải được dữ liệu vùng/lô từ máy chủ"))
      .finally(() => setLoading(false));
  }, []);

  const [expandedZones, setExpandedZones] = React.useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [confirm, setConfirm] = React.useState<ConfirmTarget | null>(null);
  const [viewMode, setViewMode] = React.useState<"list" | "grid">(() =>
    (localStorage.getItem("akf_zones_view") as "list" | "grid") || "list");
  const switchView = (m: "list" | "grid") => { setViewMode(m); localStorage.setItem("akf_zones_view", m); };

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

  // Mở Bản đồ nhiệt và zoom vào đúng lô khi bấm trong dạng Lưới hoặc trên mini-map
  const goToPlotMap = (plotId: string) => navigate(`/admin/heatmap?plot=${plotId}`);
  // Mở trang sửa lô khi bấm tên lô ở dạng Danh sách
  const goToPlotEdit = (plotId: string) => navigate(`/admin/zones/edit/${plotId}`);
  // Vẫn giữ điều hướng tới lịch công việc khi bấm vào tiến độ ở dạng Danh sách
  const goToPlotCalendar = (plotId: string) => navigate(`/admin/calendar?plot=${plotId}`);

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

  const doDeleteZone = async (zoneId: string) => {
    try {
      await deleteZone(zoneId);
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
      setPlots((prev) => prev.filter((p) => p.zoneId !== zoneId));
      closeConfirm();
    } catch (e: any) {
      toast.error(e?.message || "Không xóa được vùng. Vui lòng thử lại.");
    }
  };

  const doDeletePlot = async (plotId: string) => {
    try {
      await deletePlot(plotId);
      setPlots((prev) => prev.filter((p) => p.id !== plotId));
      closeConfirm();
    } catch (e: any) {
      toast.error(e?.message || "Không xóa được lô. Vui lòng thử lại.");
    }
  };

  const doDeactivatePlot = async (plotId: string) => {
    await updatePlot(plotId, { status: "inactive" }).catch(() => {});
    setPlots((prev) =>
      prev.map((p) => (p.id === plotId ? { ...p, status: "inactive" } : p))
    );
    closeConfirm();
  };

  const statusMeta = (status: string) =>
    STATUS_META[(status as PlotStatus)] ?? STATUS_META.pending;

  // "Loại cây": ưu tiên cây từ chu kỳ active; chưa có chu kỳ thì dùng cây đã gắn khi tạo lô (cropTags)
  const cropListOf = (plot: PlotItem): CropOnPlot[] =>
    plot.crops.length > 0
      ? plot.crops
      : plot.cropTags && plot.cropTags.length
        ? plot.cropTags.map((c) => ({ crop: c, done: 0, total: 0, status: plot.status }))
        : [{ crop: plot.crop, done: plot.done, total: plot.total, status: plot.status }];

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Đang tải dữ liệu vùng/lô…</div>;
  }
  if (loadError) {
    return <div className="p-10 text-center text-red-600">{loadError}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header / Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm lô, cây trồng, tổ trưởng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg w-full sm:w-auto"
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
        <div className="flex gap-3 items-center">
          {/* Toggle xem dạng Danh sách / Lưới có mini-map */}
          <div className="inline-flex border border-gray-300 rounded-lg overflow-hidden">
            <button onClick={() => switchView("list")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm ${viewMode === "list" ? "bg-green-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              aria-pressed={viewMode === "list"} title="Danh sách">
              <List className="w-4 h-4" /> Danh sách
            </button>
            <button onClick={() => switchView("grid")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-l border-gray-300 ${viewMode === "grid" ? "bg-green-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              aria-pressed={viewMode === "grid"} title="Lưới + Bản đồ">
              <LayoutGrid className="w-4 h-4" /> Lưới
            </button>
          </div>
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

      {/* Dạng LƯỚI: mỗi vùng là 1 card có mini-map chia lô + chip điều hướng */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {zones.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3 bg-white rounded-lg shadow border border-gray-200 p-10 text-center text-gray-400">
              Không còn vùng nào.
            </div>
          )}
          {zones.map((zone) => {
            const zonePlots = plots.filter((p) => p.zoneId === zone.id);
            const visiblePlots = zonePlots.filter(plotMatches);
            const filtering = term !== "" || statusFilter !== "all";
            if (filtering && visiblePlots.length === 0) return null;
            const zoneMeta = statusMeta(zone.status);
            const zonePoly = polygonFromGeoJSON(zone.boundary);
            const mapPlots = (filtering ? visiblePlots : zonePlots)
              .map((p) => ({ id: p.id, name: p.name, status: p.status,
                             polygon: polygonFromGeoJSON(p.boundary) || [] as LatLng[] }));
            return (
              <div key={`grid-${zone.id}`} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="font-semibold text-gray-900 truncate">{zone.name}</span>
                  </div>
                  <StatusBadge status={zoneMeta.badge}>{zoneMeta.label}</StatusBadge>
                </div>
                <div className="aspect-[4/3] bg-gray-50 border-b border-gray-200">
                  <ZoneMiniMap zonePoly={zonePoly} plots={mapPlots} onPlotClick={goToPlotMap} />
                </div>
                <div className="p-3 space-y-2 flex-1">
                  <div className="text-xs text-gray-500">
                    {zone.area.toLocaleString()} m² · {zonePlots.length} lô{filtering ? ` · ${visiblePlots.length} khớp` : ""}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(filtering ? visiblePlots : zonePlots).map((p) => {
                      const pm = statusMeta(p.status);
                      const color = FILL[p.status] || FILL.pending;
                      return (
                        <span key={`chip-${p.id}`}
                          className="inline-flex items-center rounded-full text-xs bg-gray-50 border border-gray-200 overflow-hidden">
                          <button onClick={() => goToPlotMap(p.id)}
                            title={`${p.name} · ${pm.label} · ${p.done}/${p.total} · Xem trên bản đồ`}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 hover:bg-gray-100">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="font-medium text-gray-800">{p.name}</span>
                            <span className="text-gray-500">{p.done}/{p.total}</span>
                          </button>
                          <Link to={`/admin/zones/edit/${p.id}`} title="Sửa lô"
                            className="px-1.5 py-0.5 border-l border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-green-700">
                            <Edit2 className="w-3 h-3" />
                          </Link>
                        </span>
                      );
                    })}
                    {zonePlots.length === 0 && (
                      <span className="text-xs text-gray-400">Chưa có lô.</span>
                    )}
                  </div>
                </div>
                <div className="px-3 pb-3 pt-1 flex gap-2 mt-auto border-t border-gray-100">
                  <Link to={`/admin/zones/add?type=plot&zone=${zone.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      <Plus className="w-4 h-4 mr-1" /> Thêm lô
                    </Button>
                  </Link>
                  <button onClick={() => askDeleteZone(zone)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200">
                    <Trash2 className="w-4 h-4" /> Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cây Vùng & Lô (accordion theo zone) — dạng danh sách */}
      {viewMode === "list" && (
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
              <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 sm:px-5 py-4 bg-gray-50 border-b border-gray-200">
                <button
                  onClick={() => toggleZone(zone.id)}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 text-left min-w-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-600 shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600 shrink-0" />
                  )}
                  <Layers className="w-5 h-5 text-green-600 shrink-0" />
                  <span className="font-semibold text-gray-900">{zone.name}</span>
                  <span className="text-sm text-gray-500">
                    · {zone.area.toLocaleString()} m² · {zonePlots.length} lô
                  </span>
                  <StatusBadge status={zoneMeta.badge}>{zoneMeta.label}</StatusBadge>
                </button>
                <div className="flex items-center gap-1 shrink-0">
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
                <>
                {/* Bảng đầy đủ (chỉ hiện từ md trở lên) */}
                <div className="hidden md:block overflow-x-auto">
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
                        const cropList = cropListOf(plot);

                        return (
                          <tr key={plot.id} className="hover:bg-gray-50">
                            {/* Tên lô -> trang sửa lô */}
                            <td className="px-5 py-4">
                              <button
                                onClick={() => goToPlotEdit(plot.id)}
                                className="font-medium text-green-700 hover:underline text-left"
                                title="Sửa lô"
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
                            {/* Tiến độ: bấm để mở lịch công việc của lô */}
                            <td className="px-5 py-4">
                              <button
                                onClick={() => goToPlotCalendar(plot.id)}
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

                {/* Dạng thẻ cho màn nhỏ (chỉ hiện dưới md) - không tràn ngang */}
                <div className="md:hidden divide-y divide-gray-200">
                  {visiblePlots.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      Chưa có lô nào trong vùng này.
                    </div>
                  )}
                  {visiblePlots.map((plot) => {
                    // Danh sách cây xen canh trên lô (Gấc tầng trên + Sâm tầng dưới)
                    const cropList = cropListOf(plot);

                    return (
                      <div key={`m-${plot.id}`} className="p-4 space-y-3">
                        {/* Tên lô + diện tích */}
                        <div>
                          <button
                            onClick={() => goToPlotEdit(plot.id)}
                            className="font-medium text-green-700 hover:underline text-left break-words"
                            title="Sửa lô"
                          >
                            {plot.name}
                          </button>
                          <div className="text-xs text-gray-400">
                            {plot.area.toLocaleString()} m²
                          </div>
                        </div>

                        {/* Chip các cây */}
                        <div className="flex flex-wrap gap-1.5">
                          {cropList.map((c, i) => (
                            <span
                              key={`m-${plot.id}-crop-${i}`}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                            >
                              {c.crop}
                            </span>
                          ))}
                        </div>

                        {/* Tổ trưởng */}
                        <div className="text-sm text-gray-700">
                          <span className="text-gray-500">Tổ trưởng: </span>
                          {plot.teamLeader}
                        </div>

                        {/* Từng cây 1 dòng: badge trạng thái + thanh tiến độ */}
                        <div className="space-y-3">
                          {cropList.map((c, i) => {
                            const cMeta = statusMeta(c.status);
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
                              <div key={`m-${plot.id}-row-${i}`}>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-xs font-medium text-gray-700">
                                    {c.crop}
                                  </span>
                                  <StatusBadge status={cMeta.badge}>
                                    {cMeta.label}
                                  </StatusBadge>
                                </div>
                                <button
                                  onClick={() => goToPlotCalendar(plot.id)}
                                  className="w-full text-left group"
                                  title="Xem lịch công việc"
                                >
                                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                    <span className="group-hover:text-green-700">
                                      {c.done}/{c.total}
                                    </span>
                                    <span className="text-gray-400">{cPct}%</span>
                                  </div>
                                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${cBarColor}`}
                                      style={{ width: `${cPct}%` }}
                                    />
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Thao tác: Sửa / Xóa */}
                        <div className="flex items-center gap-2 pt-1">
                          <Link to={`/admin/zones/edit/${plot.id}`} className="flex-1">
                            <Button variant="ghost" size="sm" className="w-full border border-gray-300">
                              Sửa
                            </Button>
                          </Link>
                          <button
                            onClick={() => askDeletePlot(plot)}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                            Xóa
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      )}

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
